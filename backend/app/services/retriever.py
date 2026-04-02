"""Data retrieval service extracted from recommend.py for reuse in the agent pipeline."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.facility import Facility
from app.models.place import Place
from app.models.subway import SubwayStation
from app.services.clustering import compute_clusters
from app.services.data_loader import DISTRICT_COORDS
from app.utils import haversine


def get_district_places(db: Session, district: str, limit: int = 20) -> list[dict]:
    """Get top places in a district."""
    rows = db.query(Place).filter(Place.district == district).limit(limit).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "lat": p.lat,
            "lng": p.lng,
            "address": p.address,
            "image_url": p.image_url,
        }
        for p in rows
    ]


def get_places_by_category(db: Session, category: str, limit: int = 20) -> list[dict]:
    """Get places matching a category keyword."""
    rows = (
        db.query(Place)
        .filter(Place.category.ilike(f"%{category}%"))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "district": p.district,
            "lat": p.lat,
            "lng": p.lng,
            "address": p.address,
            "image_url": p.image_url,
        }
        for p in rows
    ]


def search_places_by_name(db: Session, query: str, limit: int = 10) -> list[dict]:
    """Search places by name."""
    rows = (
        db.query(Place)
        .filter(Place.name.ilike(f"%{query}%"))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "district": p.district,
            "lat": p.lat,
            "lng": p.lng,
            "address": p.address,
            "image_url": p.image_url,
        }
        for p in rows
    ]


def get_nearby_stations(
    lat: float, lng: float, db: Session, limit: int = 5
) -> list[dict]:
    """Return the nearest subway stations to a given point."""
    all_stations = db.query(SubwayStation).all()
    scored = []
    for s in all_stations:
        dist = haversine(lat, lng, s.lat, s.lng)
        scored.append({"name": s.name, "line": s.line, "distance_km": round(dist, 2)})
    scored.sort(key=lambda x: x["distance_km"])
    return scored[:limit]


def get_district_stats(db: Session, district: str) -> list[dict]:
    """Get facility category stats for a district."""
    rows = (
        db.query(Facility.category, Facility.count)
        .filter(Facility.district == district)
        .all()
    )
    return [{"category": cat, "count": cnt} for cat, cnt in rows]


def get_cluster_info(db: Session, district: str) -> dict | None:
    """Get cluster info for a district."""
    try:
        result = compute_clusters(db)
        label = result["district_labels"].get(district)
        if label is not None:
            for c in result["clusters"]:
                if c["id"] == label:
                    return c
    except Exception:
        pass
    return None


def get_district_context(db: Session, district: str) -> dict:
    """Get full context for a district: stats, places, stations, cluster."""
    lat, lng = DISTRICT_COORDS.get(district, (37.5665, 126.9780))
    return {
        "district": district,
        "stats": get_district_stats(db, district),
        "places": get_district_places(db, district),
        "nearby_stations": get_nearby_stations(lat, lng, db),
        "cluster_info": get_cluster_info(db, district),
    }
