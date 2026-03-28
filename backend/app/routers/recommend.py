from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.facility import Facility
from app.models.place import Place
from app.models.subway import SubwayStation
from app.services.clustering import compute_clusters

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate haversine distance in km between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _find_nearest_stations(
    lat: float, lng: float, stations: list[SubwayStation], limit: int = 3
) -> list[dict]:
    """Return the nearest subway stations to a given point."""
    scored = []
    for s in stations:
        dist = _haversine(lat, lng, s.lat, s.lng)
        scored.append({"name": s.name, "line": s.line, "distance_km": round(dist, 2)})
    scored.sort(key=lambda x: x["distance_km"])
    return scored[:limit]


def _build_prompt(
    district: str,
    stats: list[dict],
    top_places: list[dict],
    nearby_stations: list[dict],
    cluster_info: dict | None,
    lang: str,
) -> str:
    lang_label = "Korean" if lang == "ko" else "English"
    stats_text = "\n".join(f"- {s['category']}: {s['count']}개" for s in stats)
    places_text = "\n".join(f"- {p['name']} ({p['category']})" for p in top_places)
    stations_text = "\n".join(
        f"- {s['name']} ({s['line']}, {s['distance_km']}km)" for s in nearby_stations
    )

    cluster_text = ""
    if cluster_info:
        cluster_text = (
            f"\nDistrict cluster type: {cluster_info['name']}\n"
            f"Dominant categories: {', '.join(cluster_info['dominant_categories'])}\n"
        )

    return (
        f"You are a friendly Seoul travel guide. "
        f"The user wants a half-day tour course in {district}.\n\n"
        f"Here are the cultural facility statistics for {district}:\n{stats_text}\n\n"
        f"Top facilities in this district:\n{places_text}\n\n"
        f"Nearby subway stations:\n{stations_text}\n"
        f"{cluster_text}\n"
        f"Create a recommended tour course with 3-5 stops. "
        f"For each stop, briefly describe why it's worth visiting. "
        f"Suggest a route using subway stations, like: "
        f"\"Station A → Facility 1 → Facility 2 → Station B\". "
        f"Include which subway station to start from and which to end at. "
        f"End with a short tip for visitors.\n"
        f"Respond in {lang_label}."
    )


def _fallback_recommendation(
    district: str,
    top_places: list[dict],
    nearby_stations: list[dict],
    cluster_info: dict | None,
    lang: str,
) -> str:
    if lang == "ko":
        header = f"{district} 추천 투어 코스"
        if cluster_info:
            header += f" ({cluster_info['name']})"
        lines = [f"{i+1}. {p['name']} ({p['category']})" for i, p in enumerate(top_places[:5])]
        if nearby_stations:
            station_lines = [f"  🚇 {s['name']} ({s['line']})" for s in nearby_stations[:3]]
            lines.append("\n가까운 지하철역:")
            lines.extend(station_lines)
        footer = "* AI 추천을 사용하려면 OPENAI_API_KEY를 설정해주세요."
    else:
        header = f"Recommended tour in {district}"
        if cluster_info:
            header += f" ({cluster_info['name']})"
        lines = [f"{i+1}. {p['name']} ({p['category']})" for i, p in enumerate(top_places[:5])]
        if nearby_stations:
            station_lines = [f"  Subway: {s['name']} ({s['line']})" for s in nearby_stations[:3]]
            lines.append("\nNearby subway stations:")
            lines.extend(station_lines)
        footer = "* Set OPENAI_API_KEY for AI-powered recommendations."
    return f"{header}\n" + "\n".join(lines) + f"\n\n{footer}"


@router.get("")
def get_recommendation(
    district: str = Query(..., description="District name (자치구)"),
    lang: str = Query("ko", description="Language: ko or en"),
    db: Session = Depends(get_db),
):
    """Generate an AI tour course recommendation for the given district."""

    # Gather district facility stats
    stats_rows = (
        db.query(Facility.category, Facility.count)
        .filter(Facility.district == district)
        .all()
    )
    stats = [{"category": cat, "count": cnt} for cat, cnt in stats_rows]

    # Get top places in the district
    top_places_rows = (
        db.query(Place)
        .filter(Place.district == district)
        .limit(20)
        .all()
    )
    top_places = [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "lat": p.lat,
            "lng": p.lng,
        }
        for p in top_places_rows
    ]

    # Get nearby subway stations (use district center coordinates)
    from app.services.data_loader import DISTRICT_COORDS

    district_lat, district_lng = DISTRICT_COORDS.get(district, (37.5665, 126.9780))
    all_stations = db.query(SubwayStation).all()
    nearby_stations = _find_nearest_stations(district_lat, district_lng, all_stations, limit=5)

    # Get cluster info for this district
    cluster_info = None
    try:
        cluster_result = compute_clusters(db)
        district_label = cluster_result["district_labels"].get(district)
        if district_label is not None:
            for c in cluster_result["clusters"]:
                if c["id"] == district_label:
                    cluster_info = c
                    break
    except Exception:
        pass

    # Try OpenAI if key is set
    recommendation_text: str
    if settings.OPENAI_API_KEY:
        try:
            import httpx as _httpx

            prompt = _build_prompt(district, stats, top_places, nearby_stations, cluster_info, lang)
            resp = _httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1024,
                    "temperature": 0.7,
                },
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            recommendation_text = data["choices"][0]["message"]["content"] or ""
        except Exception:
            recommendation_text = _fallback_recommendation(
                district, top_places, nearby_stations, cluster_info, lang
            )
    else:
        recommendation_text = _fallback_recommendation(
            district, top_places, nearby_stations, cluster_info, lang
        )

    return {
        "recommendation": recommendation_text,
        "district": district,
        "facilities": top_places[:10],
        "nearby_stations": nearby_stations,
        "cluster": cluster_info,
    }
