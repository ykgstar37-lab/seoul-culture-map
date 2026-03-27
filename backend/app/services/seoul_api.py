"""
서울 열린데이터광장 API 연동 서비스
- culturalSpaceInfo: 문화공간 (1,039건)
- SearchParkInfoService: 공원 (133건)
"""
import httpx
import logging
from sqlalchemy.orm import Session
from app.models.place import Place
from app.models.subway import SubwayStation
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "http://openapi.seoul.go.kr:8088"

# 카테고리 매핑 (SUBJCODE → 우리 카테고리)
CULTURE_CATEGORY_MAP = {
    "공연장": "공연시설",
    "미술관": "박물관/유적지",
    "박물관": "박물관/유적지",
    "기타": "공연시설",
    "영화관": "영화관",
    "도서관": "박물관/유적지",
    "문화원": "공연시설",
    "문화예술회관": "공연시설",
    "복합문화시설": "공연시설",
}

PARK_DISTRICT_MAP = {
    "강남구": "강남구", "강동구": "강동구", "강북구": "강북구", "강서구": "강서구",
    "관악구": "관악구", "광진구": "광진구", "구로구": "구로구", "금천구": "금천구",
    "노원구": "노원구", "도봉구": "도봉구", "동대문구": "동대문구", "동작구": "동작구",
    "마포구": "마포구", "서대문구": "서대문구", "서초구": "서초구", "성동구": "성동구",
    "성북구": "성북구", "송파구": "송파구", "양천구": "양천구", "영등포구": "영등포구",
    "용산구": "용산구", "은평구": "은평구", "종로구": "종로구", "중구": "중구", "중랑구": "중랑구",
}


async def fetch_cultural_spaces(api_key: str) -> list[dict]:
    """문화공간 전체 가져오기 (페이징)"""
    all_rows = []
    start = 1
    page_size = 1000

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            end = start + page_size - 1
            url = f"{BASE_URL}/{api_key}/json/culturalSpaceInfo/{start}/{end}/"
            resp = await client.get(url)
            data = resp.json()

            info = data.get("culturalSpaceInfo", {})
            total = info.get("list_total_count", 0)
            rows = info.get("row", [])

            if not rows:
                break

            all_rows.extend(rows)
            logger.info(f"culturalSpaceInfo: fetched {len(all_rows)}/{total}")

            if len(all_rows) >= total:
                break
            start = end + 1

    return all_rows


async def fetch_parks(api_key: str) -> list[dict]:
    """공원 전체 가져오기"""
    all_rows = []
    start = 1
    page_size = 1000

    async with httpx.AsyncClient(timeout=30) as client:
        url = f"{BASE_URL}/{api_key}/json/SearchParkInfoService/{start}/{page_size}/"
        resp = await client.get(url)
        data = resp.json()

        info = data.get("SearchParkInfoService", {})
        rows = info.get("row", [])
        all_rows.extend(rows)
        logger.info(f"SearchParkInfoService: fetched {len(all_rows)}")

    return all_rows


def _extract_district(addr: str) -> str | None:
    """주소에서 자치구 추출"""
    if not addr:
        return None
    for district in PARK_DISTRICT_MAP:
        if district in addr:
            return district
    return None


def _safe_float(val) -> float | None:
    try:
        f = float(val)
        return f if 33 < f < 39 or 124 < f < 130 else None
    except (TypeError, ValueError):
        return None


async def fetch_subway_stations(api_key: str) -> list[dict]:
    """지하철역 마스터 데이터 가져오기"""
    all_rows = []
    async with httpx.AsyncClient(timeout=30) as client:
        url = f"{BASE_URL}/{api_key}/json/subwayStationMaster/1/1000/"
        resp = await client.get(url)
        data = resp.json()

        info = data.get("subwayStationMaster", {})
        rows = info.get("row", [])
        all_rows.extend(rows)
        logger.info(f"subwayStationMaster: fetched {len(all_rows)}")

    return all_rows


async def sync_subway_stations(db: Session):
    """지하철역 데이터를 서울 공공데이터 API에서 가져와 DB를 갱신"""
    api_key = settings.SEOUL_DATA_API_KEY
    if not api_key:
        logger.warning("SEOUL_DATA_API_KEY not set, skipping subway sync")
        return

    subway_rows = await fetch_subway_stations(api_key)
    new_stations = []

    for row in subway_rows:
        name = (row.get("BLDN_NM") or "").strip()
        line = (row.get("ROUTE") or "").strip()
        lat = _safe_float(row.get("LAT"))
        lng = _safe_float(row.get("LOT"))

        if not name or lat is None or lng is None:
            continue

        new_stations.append(SubwayStation(
            name=name,
            line=line,
            lat=lat,
            lng=lng,
        ))

    if new_stations:
        db.query(SubwayStation).delete()
        db.add_all(new_stations)
        db.commit()
        logger.info(f"Subway station sync complete: {len(new_stations)} stations")
    else:
        logger.warning("No subway station data fetched from Seoul API")


async def sync_from_seoul_api(db: Session):
    """서울 공공데이터 API에서 최신 데이터를 가져와 DB를 갱신"""
    api_key = settings.SEOUL_DATA_API_KEY
    if not api_key:
        logger.warning("SEOUL_DATA_API_KEY not set, skipping API sync")
        return

    logger.info("Starting Seoul Open Data API sync...")

    # 1. 문화공간
    culture_rows = await fetch_cultural_spaces(api_key)
    new_places = []

    for row in culture_rows:
        lat = _safe_float(row.get("X_COORD"))
        lng = _safe_float(row.get("Y_COORD"))
        name = row.get("FAC_NAME", "").strip()
        addr = row.get("ADDR", "")
        district = row.get("GNGU", "") or _extract_district(addr)
        subj = row.get("SUBJCODE", "")
        category = CULTURE_CATEGORY_MAP.get(subj, "공연시설")

        if not name or not district:
            continue

        new_places.append(Place(
            name=name,
            category=category,
            district=district,
            dong="",
            lat=lat or 0,
            lng=lng or 0,
            address=addr,
            tel=row.get("PHNE", ""),
            url=row.get("HOMEPAGE", ""),
        ))

    # 2. 공원
    park_rows = await fetch_parks(api_key)

    for row in park_rows:
        lat = _safe_float(row.get("XCRD"))
        lng = _safe_float(row.get("YCRD"))
        name = row.get("PARK_NM", "").strip()
        addr = row.get("PARK_ADDR", "")
        district = _extract_district(addr) or row.get("RGN", "")

        if not name or not district:
            continue

        new_places.append(Place(
            name=name,
            category="공원",
            district=district,
            dong="",
            lat=lat or 0,
            lng=lng or 0,
            address=addr,
            tel=row.get("TELNO", ""),
            url=row.get("URL", ""),
        ))

    if new_places:
        # API 소스 데이터만 삭제 후 재삽입 (dong이 빈 문자열 + CSV 카테고리가 아닌 것)
        # CSV 데이터(dong 값 있음)는 유지
        db.query(Place).filter(Place.dong == "", Place.url != "").delete()
        db.add_all(new_places)
        db.commit()
        logger.info(f"Seoul API sync complete: {len(new_places)} places (culture: {len(culture_rows)}, parks: {len(park_rows)})")
    else:
        logger.warning("No data fetched from Seoul API")

    # 3. 지하철역
    await sync_subway_stations(db)
