from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class IntentClassification(BaseModel):
    """Structured output for user intent classification."""

    intent: Literal["recommend", "search", "info", "chitchat"] = Field(
        description=(
            "recommend: user wants a tour course or place recommendations for a district. "
            "search: user is looking for a specific type of place (e.g. 'museums near me'). "
            "info: user asks about a specific place or district facts. "
            "chitchat: general conversation unrelated to Seoul tourism."
        )
    )
    district: str | None = Field(
        default=None,
        description="Seoul district name if mentioned (e.g. '종로구', '강남구'). None if not specified.",
    )
    category: str | None = Field(
        default=None,
        description="Facility category if mentioned (e.g. '공원', '박물관', '공연시설'). None if not specified.",
    )


class PlaceReference(BaseModel):
    """A place to display on the map."""

    id: int
    name: str
    lat: float
    lng: float
    category: str


class AgentResponse(BaseModel):
    """Structured output from the response generation node."""

    text: str = Field(description="The response text in markdown format.")
    place_names: list[str] = Field(
        default_factory=list,
        description="Names of recommended places from the provided context (exact match).",
    )
