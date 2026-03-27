"""
한국관광공사 국문 관광정보 서비스 API 연동
- 관광지, 문화시설, 축제/공연, 레포츠 등 서울 최신 데이터
"""
import httpx
import logging
from sqlalchemy.orm import Session
from app.models.place import Place
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://apis.data.go.kr/B551011/KorService2/areaBasedList2"

# contentTypeId → 우리 카테고리 매핑
CONTENT_TYPE_MAP = {
    "12": "관광지",
    "14": "문화시설",
    "15": "공연시설",    # 축제/공연 → 공연시설
    "28": "레포츠",      # 레포츠 → 방탈출/액티비티
}

# 가져올 콘텐츠 타입 (관광지, 문화시설, 축제/공연, 레포츠)
TARGET_CONTENT_TYPES = ["12", "14", "15", "28"]


async def fetch_tour_data(api_key: str, content_type_id: str, area_code: str = "1") -> list[dict]:
    """한국관광공사 API에서 특정 콘텐츠 타입의 서울 데이터를 전부 가져오기"""
    all_items = []
    page = 1
    page_size = 500

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            params = {
                "serviceKey": api_key,
                "MobileOS": "ETC",
                "MobileApp": "SeoulCultureMap",
                "_type": "json",
                "numOfRows": str(page_size),
                "pageNo": str(page),
                "areaCode": area_code,
                "contentTypeId": content_type_id,
            }
            resp = await client.get(BASE_URL, params=params)
            data = resp.json()

            body = data.get("response", {}).get("body", {})
            total = body.get("totalCount", 0)
            items = body.get("items", {})

            if isinstance(items, dict):
                item_list = items.get("item", [])
            else:
                item_list = []

            if not item_list:
                break

            all_items.extend(item_list)
            logger.info(f"Tour API (type={content_type_id}): fetched {len(all_items)}/{total}")

            if len(all_items) >= total:
                break
            page += 1

    return all_items


def _safe_float(val) -> float | None:
    try:
        f = float(val)
        return f if 33 < f < 39 or 124 < f < 130 else None
    except (TypeError, ValueError):
        return None


def _extract_district(addr: str) -> str | None:
    """주소에서 자치구 추출"""
    districts = [
        "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
        "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
        "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ]
    if not addr:
        return None
    for d in districts:
        if d in addr:
            return d
    return None


async def sync_from_tour_api(db: Session):
    """한국관광공사 API에서 서울 관광 데이터를 가져와 DB 갱신"""
    api_key = settings.TOUR_API_KEY
    if not api_key:
        logger.warning("TOUR_API_KEY not set, skipping Tour API sync")
        return

    logger.info("Starting Tour API sync...")
    new_places = []

    for ct_id in TARGET_CONTENT_TYPES:
        category = CONTENT_TYPE_MAP[ct_id]
        items = await fetch_tour_data(api_key, ct_id)

        for item in items:
            title = (item.get("title") or "").strip()
            addr = item.get("addr1", "")
            district = _extract_district(addr)
            lat = _safe_float(item.get("mapy"))
            lng = _safe_float(item.get("mapx"))

            if not title or not district:
                continue

            image = (item.get("firstimage") or item.get("firstimage2") or "").strip()

            new_places.append(Place(
                name=title,
                category=category,
                district=district,
                dong="tour_api",
                lat=lat or 0,
                lng=lng or 0,
                address=addr + " " + (item.get("addr2") or ""),
                tel=item.get("tel", ""),
                url="",
                image_url=image or None,
            ))

        logger.info(f"Tour API type={ct_id} ({category}): {len(items)} items → {sum(1 for p in new_places if p.category == category)} valid")

    if new_places:
        # Delete old tour API data and replace
        db.query(Place).filter(Place.dong == "tour_api").delete()
        db.add_all(new_places)
        db.commit()
        logger.info(f"Tour API sync complete: {len(new_places)} places")
    else:
        logger.warning("No data fetched from Tour API")
