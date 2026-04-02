"""LangGraph node functions for the Seoul Culture Map agent."""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from app.agent.schemas import AgentResponse, IntentClassification
from app.agent.state import AgentState
from app.config import settings
from app.services.retriever import (
    get_district_context,
    get_district_places,
    get_places_by_category,
    search_places_by_name,
)
from app.services.vectorstore import search_places as vector_search

VALID_DISTRICTS = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
    "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
    "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
]


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
    )


# ── Node 1: Intent Classification ──


def classify_intent(state: AgentState, db: Session) -> dict:
    """Classify user intent using structured output."""
    llm = _get_llm()
    classifier = llm.with_structured_output(IntentClassification)

    system_prompt = (
        "You are an intent classifier for a Seoul cultural tourism chatbot.\n"
        "Classify the user's message into one of these intents:\n"
        "- recommend: wants tour course, place recommendations, things to do in a district\n"
        "- search: looking for a specific type/category of place (e.g. '박물관 어디있어?')\n"
        "- info: asking about a specific place or district factual info\n"
        "- chitchat: general greeting or off-topic conversation\n\n"
        f"Valid districts: {', '.join(VALID_DISTRICTS)}\n"
        "Valid categories: 관광지, 문화시설, 공연시설, 박물관/유적지, 유적지, 공원, 레포츠, "
        "영화관, 방탈출, 전통사찰\n\n"
        "Extract district and category if mentioned. "
        "If the user mentions a neighborhood or landmark, infer the district."
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["user_message"]),
    ]

    result: IntentClassification = classifier.invoke(messages)

    return {
        "intent": result.intent,
        "district": result.district,
        "category": result.category,
    }


# ── Node 2: Data Retrieval ──


def retrieve_data(state: AgentState, db: Session) -> dict:
    """Retrieve relevant data from SQLite based on classified intent."""
    intent = state.get("intent", "recommend")
    district = state.get("district")
    category = state.get("category")

    places: list[dict] = []
    nearby_stations: list[dict] = []
    cluster_info: dict | None = None
    district_stats: list[dict] = []

    if intent == "recommend" and district:
        ctx = get_district_context(db, district)
        places = ctx["places"]
        nearby_stations = ctx["nearby_stations"]
        cluster_info = ctx["cluster_info"]
        district_stats = ctx["stats"]

    elif intent == "search":
        # Use ChromaDB semantic search first, fall back to SQL
        semantic_results = vector_search(
            query=state["user_message"],
            district=district,
            category=category,
            limit=15,
        )
        if semantic_results:
            places = semantic_results
        elif category:
            places = get_places_by_category(db, category, limit=15)

        if district:
            ctx = get_district_context(db, district)
            if not places:
                places = ctx["places"]
            nearby_stations = ctx["nearby_stations"]

    elif intent == "info":
        # Try semantic search for natural language queries
        semantic_results = vector_search(
            query=state["user_message"],
            district=district,
            limit=10,
        )
        if district:
            ctx = get_district_context(db, district)
            places = semantic_results or ctx["places"][:10]
            nearby_stations = ctx["nearby_stations"]
            cluster_info = ctx["cluster_info"]
            district_stats = ctx["stats"]
        elif semantic_results:
            places = semantic_results
        else:
            places = search_places_by_name(db, state["user_message"], limit=10)

    # Fallback: if no district specified for recommend, use a popular one
    if intent == "recommend" and not district and not places:
        ctx = get_district_context(db, "종로구")
        places = ctx["places"]
        nearby_stations = ctx["nearby_stations"]
        cluster_info = ctx["cluster_info"]
        district_stats = ctx["stats"]

    return {
        "places": places,
        "nearby_stations": nearby_stations,
        "cluster_info": cluster_info,
        "district_stats": district_stats,
    }


# ── Node 3: Response Generation ──


def _build_context(state: AgentState) -> str:
    """Build context string from retrieved data for the LLM."""
    parts = []

    district = state.get("district")
    if district:
        parts.append(f"District: {district}")

    stats = state.get("district_stats", [])
    if stats:
        stats_text = ", ".join(f"{s['category']}: {s['count']}개" for s in stats)
        parts.append(f"Facility statistics: {stats_text}")

    places = state.get("places", [])
    if places:
        place_lines = []
        for p in places[:15]:
            line = f"- {p['name']} ({p['category']}"
            if p.get("district"):
                line += f", {p['district']}"
            line += ")"
            if p.get("address"):
                line += f" — {p['address']}"
            place_lines.append(line)
        parts.append(f"Available places:\n" + "\n".join(place_lines))

    stations = state.get("nearby_stations", [])
    if stations:
        station_lines = [
            f"- {s['name']} ({s['line']}, {s['distance_km']}km)"
            for s in stations[:5]
        ]
        parts.append(f"Nearby subway stations:\n" + "\n".join(station_lines))

    cluster = state.get("cluster_info")
    if cluster:
        parts.append(
            f"District type: {cluster['name']} "
            f"(dominant: {', '.join(cluster['dominant_categories'])})"
        )

    return "\n\n".join(parts)


def generate_response(state: AgentState, db: Session) -> dict:
    """Generate the final response using LLM with retrieved context."""
    llm = _get_llm()
    intent = state.get("intent", "chitchat")

    context = _build_context(state)

    # Build conversation history
    history_msgs = []
    for msg in state.get("messages", [])[-8:]:
        if msg["role"] == "user":
            history_msgs.append(HumanMessage(content=msg["content"]))
        else:
            history_msgs.append(SystemMessage(content=msg["content"]))

    if intent == "chitchat":
        system_prompt = (
            "You are a friendly AI mascot for 'Seoul Culture Map', "
            "a website that helps people explore cultural facilities in Seoul.\n"
            "Keep responses short and friendly. If the user seems interested in Seoul, "
            "gently guide them toward exploring the map.\n"
            "Respond in Korean."
        )
    else:
        system_prompt = (
            "You are a knowledgeable Seoul travel guide for 'Seoul Culture Map'.\n"
            "Use the following context to answer the user's question.\n"
            "Recommend specific places from the context. "
            "For tour courses, suggest 3-5 stops with subway directions.\n"
            "Use the place names exactly as provided in the context.\n"
            "Format your response in markdown with clear sections.\n"
            "Respond in Korean.\n\n"
            f"--- CONTEXT ---\n{context}\n--- END CONTEXT ---"
        )

    messages = [SystemMessage(content=system_prompt)]
    messages.extend(history_msgs)
    messages.append(HumanMessage(content=state["user_message"]))

    # Generate with structured output to extract place names
    response_llm = llm.with_structured_output(AgentResponse)
    result: AgentResponse = response_llm.invoke(messages)

    # Match place names to actual place data for map display
    places = state.get("places", [])
    response_places = []
    for p in places:
        if p["name"] in result.place_names:
            response_places.append({
                "id": p["id"],
                "name": p["name"],
                "lat": p["lat"],
                "lng": p["lng"],
                "category": p["category"],
            })

    return {
        "response_text": result.text,
        "response_places": response_places,
    }


# ── Streaming Response Generation ──


def stream_generate_response(state: AgentState, db: Session):
    """Generator that yields token chunks for SSE streaming.

    Yields dicts with type "token" or "places" or "done".
    """
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
        streaming=True,
    )
    intent = state.get("intent", "chitchat")
    context = _build_context(state)

    history_msgs = []
    for msg in state.get("messages", [])[-8:]:
        if msg["role"] == "user":
            history_msgs.append(HumanMessage(content=msg["content"]))
        else:
            history_msgs.append(SystemMessage(content=msg["content"]))

    if intent == "chitchat":
        system_prompt = (
            "You are a friendly AI mascot for 'Seoul Culture Map', "
            "a website that helps people explore cultural facilities in Seoul.\n"
            "Keep responses short and friendly. If the user seems interested in Seoul, "
            "gently guide them toward exploring the map.\n"
            "Respond in Korean."
        )
    else:
        system_prompt = (
            "You are a knowledgeable Seoul travel guide for 'Seoul Culture Map'.\n"
            "Use the following context to answer the user's question.\n"
            "Recommend specific places from the context. "
            "For tour courses, suggest 3-5 stops with subway directions.\n"
            "Use the place names exactly as provided in the context.\n"
            "Format your response in markdown with clear sections.\n"
            "Respond in Korean.\n\n"
            f"--- CONTEXT ---\n{context}\n--- END CONTEXT ---"
        )

    messages = [SystemMessage(content=system_prompt)]
    messages.extend(history_msgs)
    messages.append(HumanMessage(content=state["user_message"]))

    full_text = ""
    for chunk in llm.stream(messages):
        token = chunk.content
        if token:
            full_text += token
            yield {"type": "token", "data": token}

    # After streaming, match place names in the response
    places = state.get("places", [])
    response_places = []
    for p in places:
        if p["name"] in full_text:
            response_places.append({
                "id": p["id"],
                "name": p["name"],
                "lat": p["lat"],
                "lng": p["lng"],
                "category": p["category"],
            })

    yield {"type": "places", "data": response_places}
    yield {"type": "done", "data": full_text}
