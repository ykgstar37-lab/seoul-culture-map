from pydantic import BaseModel


class FacilityOut(BaseModel):
    id: int
    category: str
    district: str
    count: int

    model_config = {"from_attributes": True}


class CategoryCount(BaseModel):
    category: str
    count: int


class FacilityStats(BaseModel):
    total_count: int
    category_counts: list[CategoryCount]


class CategoryBreakdown(BaseModel):
    category: str
    count: int


class DistrictInfo(BaseModel):
    district: str
    total_count: int
    latitude: float
    longitude: float
    categories: list[CategoryBreakdown]


class DistrictListResponse(BaseModel):
    districts: list[DistrictInfo]


class SearchResult(BaseModel):
    facilities: list[FacilityOut]
    total: int


class PlaceOut(BaseModel):
    id: int
    name: str
    category: str
    district: str
    lat: float
    lng: float
    image_url: str | None = None

    model_config = {"from_attributes": True}


class PlaceDetail(BaseModel):
    id: int
    name: str
    category: str
    district: str
    dong: str | None = None
    lat: float
    lng: float
    address: str | None = None
    tel: str | None = None
    url: str | None = None
    image_url: str | None = None

    model_config = {"from_attributes": True}
