"""LangGraph state graph for the Seoul Culture Map agent."""

from __future__ import annotations

from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from app.agent.nodes import classify_intent, generate_response, retrieve_data, stream_generate_response
from app.agent.state import AgentState


def _route_after_intent(state: AgentState) -> str:
    """Conditional routing based on classified intent."""
    if state.get("intent") == "chitchat":
        return "generate_response"
    return "retrieve_data"


def build_graph() -> StateGraph:
    """Build and compile the agent graph."""
    graph = StateGraph(AgentState)

    graph.add_node("classify_intent", classify_intent)
    graph.add_node("retrieve_data", retrieve_data)
    graph.add_node("generate_response", generate_response)

    graph.set_entry_point("classify_intent")

    graph.add_conditional_edges(
        "classify_intent",
        _route_after_intent,
        {
            "retrieve_data": "retrieve_data",
            "generate_response": "generate_response",
        },
    )

    graph.add_edge("retrieve_data", "generate_response")
    graph.add_edge("generate_response", END)

    return graph.compile()


def run_agent(user_message: str, db: Session, messages: list[dict] | None = None) -> dict:
    """Run the agent pipeline and return the response.

    Returns:
        dict with keys: response_text, response_places, intent, district, category
    """
    compiled = build_graph()

    initial_state: AgentState = {
        "user_message": user_message,
        "messages": messages or [],
    }

    # LangGraph nodes receive (state, config) — we pass db via config
    # But since our nodes need db, we wrap them to inject it.
    # The simplest approach: run each node manually isn't needed because
    # we can use functools.partial or a closure.
    # However, LangGraph's compiled graph expects node functions with
    # signature (state) -> dict. So we need to rebind.

    # Rebuild with db-bound nodes
    graph = StateGraph(AgentState)

    graph.add_node(
        "classify_intent",
        lambda state: classify_intent(state, db),
    )
    graph.add_node(
        "retrieve_data",
        lambda state: retrieve_data(state, db),
    )
    graph.add_node(
        "generate_response",
        lambda state: generate_response(state, db),
    )

    graph.set_entry_point("classify_intent")

    graph.add_conditional_edges(
        "classify_intent",
        _route_after_intent,
        {
            "retrieve_data": "retrieve_data",
            "generate_response": "generate_response",
        },
    )

    graph.add_edge("retrieve_data", "generate_response")
    graph.add_edge("generate_response", END)

    compiled = graph.compile()
    result = compiled.invoke(initial_state)

    return {
        "response_text": result.get("response_text", ""),
        "response_places": result.get("response_places", []),
        "intent": result.get("intent", ""),
        "district": result.get("district"),
        "category": result.get("category"),
    }


def run_agent_stream(user_message: str, db: Session, messages: list[dict] | None = None):
    """Run intent + retrieval, then stream the response generation.

    Yields dicts with type: "intent", "token", "places", "done".
    """
    initial_state: AgentState = {
        "user_message": user_message,
        "messages": messages or [],
    }

    # Step 1: Classify intent (non-streaming)
    intent_result = classify_intent(initial_state, db)
    state = {**initial_state, **intent_result}

    yield {"type": "intent", "data": {
        "intent": state.get("intent", ""),
        "district": state.get("district"),
        "category": state.get("category"),
    }}

    # Step 2: Retrieve data if needed (non-streaming)
    if state.get("intent") != "chitchat":
        retrieval_result = retrieve_data(state, db)
        state = {**state, **retrieval_result}

    # Step 3: Stream response generation
    yield from stream_generate_response(state, db)
