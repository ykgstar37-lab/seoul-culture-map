import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.facility import Facility
from app.models.place import Place
from app.models.subway import SubwayStation
from app.schemas.facility import (
    CategoryBreakdown,
    CategoryCount,
    DistrictInfo,
    DistrictListResponse,
    FacilityOut,
    FacilityStats,
    PlaceDetail,
    PlaceOut,
    SearchResult,
)
from app.services.clustering import compute_clusters
from app.services.data_loader import DISTRICT_COORDS

router = APIRouter(prefix="/api/facilities", tags=["facilities"])
places_router = APIRouter(prefix="/api", tags=["places"])


@router.get("", response_model=list[FacilityOut])
def get_facilities(
    category: str | None = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Return all facility records, optionally filtered by category."""
    query = db.query(Facility)
    if category:
        query = query.filter(Facility.category == category)
    return query.order_by(Facility.category, Facility.district).all()


@router.get("/stats", response_model=FacilityStats)
def get_stats(db: Session = Depends(get_db)):
    """Return total count and per-category counts from places table (latest API data)."""
    rows = (
        db.query(Place.category, func.count(Place.id))
        .group_by(Place.category)
        .all()
    )
    category_counts = [
        CategoryCount(category=cat, count=cnt) for cat, cnt in rows
    ]
    total = sum(c.count for c in category_counts)
    return FacilityStats(total_count=total, category_counts=category_counts)


@router.get("/districts", response_model=DistrictListResponse)
def get_districts(db: Session = Depends(get_db)):
    """Return per-district totals with category breakdown from places table."""
    rows = (
        db.query(Place.district, Place.category, func.count(Place.id))
        .group_by(Place.district, Place.category)
        .all()
    )

    district_map: dict[str, dict[str, int]] = {}
    for district, category, count in rows:
        if not district:
            continue
        if district not in district_map:
            district_map[district] = {}
        district_map[district][category] = count

    districts: list[DistrictInfo] = []
    for district, cat_counts in sorted(district_map.items()):
        lat, lng = DISTRICT_COORDS.get(district, (0.0, 0.0))
        if lat == 0.0 and lng == 0.0:
            continue
        categories = [
            CategoryBreakdown(category=cat, count=cnt)
            for cat, cnt in cat_counts.items()
        ]
        total = sum(cat_counts.values())
        districts.append(
            DistrictInfo(
                district=district,
                total_count=total,
                latitude=lat,
                longitude=lng,
                categories=categories,
            )
        )

    return DistrictListResponse(districts=districts)


@router.get("/districts/{district}", response_model=DistrictInfo)
def get_district_detail(district: str, db: Session = Depends(get_db)):
    """Return detail for a specific district."""
    facilities = (
        db.query(Facility)
        .filter(Facility.district == district)
        .order_by(Facility.category)
        .all()
    )
    if not facilities:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found")

    lat, lng = DISTRICT_COORDS.get(district, (0.0, 0.0))
    categories = [
        CategoryBreakdown(category=f.category, count=f.count) for f in facilities
    ]
    total = sum(f.count for f in facilities)
    return DistrictInfo(
        district=district,
        total_count=total,
        latitude=lat,
        longitude=lng,
        categories=categories,
    )


@router.get("/search", response_model=SearchResult)
def search_facilities(
    q: str = Query(..., min_length=1, description="Search keyword"),
    db: Session = Depends(get_db),
):
    """Search facilities by district or category name."""
    pattern = f"%{q}%"
    results = (
        db.query(Facility)
        .filter(
            (Facility.district.like(pattern)) | (Facility.category.like(pattern))
        )
        .order_by(Facility.category, Facility.district)
        .all()
    )
    return SearchResult(facilities=results, total=len(results))


# ---------------------------------------------------------------------------
# Place endpoints (individual facilities from CSV)
# ---------------------------------------------------------------------------

@places_router.get("/places", response_model=list[PlaceOut])
def get_places(
    district: str | None = Query(None, description="Filter by district (자치구)"),
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    db: Session = Depends(get_db),
):
    """Return individual place records with lat/lng."""
    query = db.query(Place)
    if district:
        query = query.filter(Place.district == district)
    if category:
        query = query.filter(Place.category == category)
    return query.limit(limit).all()


@places_router.get("/places/{place_id}", response_model=PlaceDetail)
def get_place_detail(place_id: int, db: Session = Depends(get_db)):
    """Return a single place by ID."""
    place = db.query(Place).filter(Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail=f"Place with id {place_id} not found")
    return place


# ---------------------------------------------------------------------------
# Clustering endpoint
# ---------------------------------------------------------------------------

@places_router.get("/clusters")
def get_clusters(db: Session = Depends(get_db)):
    """Return K-means clustering results for Seoul's 25 districts."""
    return compute_clusters(db)


# ---------------------------------------------------------------------------
# Subway endpoints
# ---------------------------------------------------------------------------

def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate haversine distance in km between two lat/lng points."""
    R = 6371.0  # Earth radius in km
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


@places_router.get("/subway")
def get_subway_stations(db: Session = Depends(get_db)):
    """Return all subway stations with lat/lng."""
    stations = db.query(SubwayStation).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "line": s.line,
            "lat": s.lat,
            "lng": s.lng,
        }
        for s in stations
    ]


@places_router.get("/subway/nearest")
def get_nearest_subway(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    limit: int = Query(3, ge=1, le=20, description="Number of nearest stations"),
    db: Session = Depends(get_db),
):
    """Return nearest subway stations to a given lat/lng point."""
    stations = db.query(SubwayStation).all()
    if not stations:
        return []

    results = []
    for s in stations:
        dist = _haversine(lat, lng, s.lat, s.lng)
        results.append({
            "id": s.id,
            "name": s.name,
            "line": s.line,
            "lat": s.lat,
            "lng": s.lng,
            "distance_km": round(dist, 3),
        })

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
