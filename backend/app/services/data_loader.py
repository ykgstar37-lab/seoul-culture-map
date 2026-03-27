import math
import os

import pandas as pd
from sqlalchemy.orm import Session

from app.models.facility import Facility
from app.models.place import Place

RAW_DATA: dict[str, dict[str, int]] = {
    "영화관": {
        "강남구": 27, "중구": 21, "종로구": 12, "마포구": 8, "영등포구": 8,
        "송파구": 7, "강서구": 6, "서초구": 5, "동대문구": 5, "광진구": 4,
        "노원구": 4, "관악구": 3, "성동구": 3, "양천구": 3, "용산구": 3,
        "구로구": 2, "금천구": 2, "은평구": 2, "서대문구": 2, "동작구": 1,
        "강동구": 1, "강북구": 1, "도봉구": 1, "중랑구": 1, "성북구": 1,
    },
    "공연시설": {
        "종로구": 162, "중구": 38, "마포구": 33, "강남구": 30, "서초구": 22,
        "용산구": 16, "서대문구": 15, "송파구": 14, "영등포구": 13, "성동구": 10,
        "광진구": 9, "강동구": 8, "노원구": 7, "은평구": 7, "동대문구": 6,
        "관악구": 5, "성북구": 5, "양천구": 4, "강서구": 4, "구로구": 3,
        "금천구": 3, "동작구": 3, "도봉구": 2, "강북구": 2, "중랑구": 2,
    },
    "박물관/유적지": {
        "강남구": 42, "종로구": 21, "서초구": 17, "용산구": 14, "중구": 12,
        "송파구": 11, "마포구": 9, "성북구": 8, "관악구": 7, "영등포구": 6,
        "강동구": 6, "서대문구": 5, "노원구": 5, "광진구": 4, "동대문구": 4,
        "성동구": 4, "은평구": 4, "구로구": 3, "금천구": 3, "강서구": 3,
        "동작구": 3, "양천구": 2, "도봉구": 2, "강북구": 2, "중랑구": 2,
    },
    "방탈출": {
        "마포구": 85, "강남구": 64, "영등포구": 25, "서초구": 19, "관악구": 17,
        "송파구": 14, "동대문구": 14, "종로구": 13, "구로구": 12, "중구": 11,
        "성동구": 10, "노원구": 9, "광진구": 8, "강서구": 7, "양천구": 6,
        "용산구": 5, "은평구": 5, "서대문구": 5, "강동구": 4, "동작구": 4,
        "금천구": 3, "성북구": 3, "중랑구": 3, "강북구": 2, "도봉구": 2,
    },
    "공원": {
        "마포구": 20, "구로구": 14, "은평구": 13, "강서구": 12, "노원구": 11,
        "성북구": 11, "서대문구": 10, "강남구": 10, "송파구": 9, "영등포구": 9,
        "양천구": 8, "관악구": 8, "동작구": 7, "종로구": 7, "강동구": 7,
        "중랑구": 6, "도봉구": 6, "성동구": 6, "금천구": 5, "용산구": 5,
        "동대문구": 5, "광진구": 5, "중구": 4, "강북구": 4, "서초구": 4,
    },
    "전통사찰": {
        "종로구": 12, "성북구": 10, "은평구": 7, "강북구": 6, "도봉구": 5,
        "관악구": 4, "노원구": 3, "마포구": 3, "서대문구": 3, "강남구": 2,
        "서초구": 2, "용산구": 2, "중구": 2, "동대문구": 1, "광진구": 1,
        "성동구": 1, "중랑구": 1, "동작구": 1, "영등포구": 1, "구로구": 1,
        "금천구": 1, "양천구": 1, "강서구": 1, "강동구": 1, "송파구": 1,
    },
}

DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "강남구": (37.5172, 127.0473),
    "강동구": (37.5301, 127.1238),
    "강북구": (37.6396, 127.0253),
    "강서구": (37.5509, 126.8495),
    "관악구": (37.4784, 126.9516),
    "광진구": (37.5385, 127.0823),
    "구로구": (37.4954, 126.8874),
    "금천구": (37.4519, 126.8964),
    "노원구": (37.6542, 127.0568),
    "도봉구": (37.6688, 127.0471),
    "동대문구": (37.5744, 127.0396),
    "동작구": (37.5124, 126.9393),
    "마포구": (37.5664, 126.9016),
    "서대문구": (37.5791, 126.9368),
    "서초구": (37.4837, 127.0324),
    "성동구": (37.5634, 127.0369),
    "성북구": (37.5894, 127.0167),
    "송파구": (37.5145, 127.1058),
    "양천구": (37.5169, 126.8664),
    "영등포구": (37.5264, 126.8963),
    "용산구": (37.5324, 126.9901),
    "은평구": (37.6027, 126.9291),
    "종로구": (37.5735, 126.9790),
    "중구": (37.5641, 126.9979),
    "중랑구": (37.6063, 127.0925),
}


def seed_database(db: Session) -> None:
    """Seed the database with facility data if the table is empty."""
    existing = db.query(Facility).first()
    if existing is not None:
        return

    facilities: list[Facility] = []
    for category, districts in RAW_DATA.items():
        for district, count in districts.items():
            facilities.append(
                Facility(category=category, district=district, count=count)
            )

    db.add_all(facilities)
    db.commit()


# ---------------------------------------------------------------------------
# Category mapping from CSV CTGRY_TWO_NM → our 6 culture categories
# ---------------------------------------------------------------------------
CATEGORY_MAP: dict[str, str] = {
    "대형레저시설": "공연시설",
    "액티비티": "방탈출",
    "지역레저시설": "공원",
    "지역체육시설": "공원",
}


def _csv_path() -> str:
    """Return path to the facility CSV file."""
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base, "..", "data", "KC_CLTUR_ACTVTY_ACTFCLTY_2023.csv")


def seed_places(db: Session) -> None:
    """Seed individual place records from the CSV if the table is empty."""
    existing = db.query(Place).first()
    if existing is not None:
        return

    csv_file = _csv_path()
    if not os.path.exists(csv_file):
        print(f"[seed_places] CSV not found at {csv_file}, skipping.")
        return

    df = pd.read_csv(csv_file, encoding="cp949")

    # Filter Seoul only
    df = df[df["CTPRVN_NM"].str.contains("서울", na=False)].copy()

    # Drop rows with missing lat/lng
    df = df.dropna(subset=["LC_LA", "LC_LO"])
    df = df[df["LC_LA"].apply(lambda v: not (isinstance(v, float) and math.isnan(v)))]
    df = df[df["LC_LO"].apply(lambda v: not (isinstance(v, float) and math.isnan(v)))]

    places: list[Place] = []
    for _, row in df.iterrows():
        category = CATEGORY_MAP.get(row.get("CTGRY_TWO_NM", ""), row.get("CTGRY_TWO_NM", "기타"))
        address = row.get("RDNMADR_NM") or row.get("LNM_ADDR") or None
        if pd.isna(address):
            address = None
        tel = row.get("TEL_NO") if not pd.isna(row.get("TEL_NO")) else None
        url = row.get("HMPG_URL") if not pd.isna(row.get("HMPG_URL")) else None

        places.append(
            Place(
                name=str(row["FCLTY_NM"]),
                category=category,
                district=str(row["SIGNGU_NM"]),
                dong=str(row["LEGALDONG_NM"]) if not pd.isna(row.get("LEGALDONG_NM")) else None,
                lat=float(row["LC_LA"]),
                lng=float(row["LC_LO"]),
                address=str(address) if address else None,
                tel=str(tel) if tel else None,
                url=str(url) if url else None,
            )
        )

    db.add_all(places)
    db.commit()
    print(f"[seed_places] Inserted {len(places)} places.")
