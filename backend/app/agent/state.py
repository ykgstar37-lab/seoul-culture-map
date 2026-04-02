from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict, total=False):
    """State that flows through the LangGraph agent pipeline."""

    # User input
    user_message: str
    messages: list[dict]  # Conversation history [{role, content}]

    # Intent classification results
    intent: str  # "recommend", "search", "info", "chitchat"
    district: str | None
    category: str | None

    # Retrieved data
    places: list[dict]
    nearby_stations: list[dict]
    cluster_info: dict | None
    district_stats: list[dict]

    # Final output
    response_text: str
    response_places: list[dict]  # [{id, name, lat, lng, category}]
