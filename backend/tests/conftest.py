import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.facility import Facility  # noqa: F401
from app.models.place import Place  # noqa: F401
from app.models.subway import SubwayStation  # noqa: F401
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed test data
    session.add(Facility(district="종로구", category="공연시설", count=162))
    session.add(Facility(district="종로구", category="공원", count=7))
    session.add(Facility(district="강남구", category="공연시설", count=30))

    session.add(Place(
        name="경복궁", category="관광지", district="종로구",
        lat=37.5796, lng=126.9770,
    ))
    session.add(Place(
        name="남산타워", category="관광지", district="용산구",
        lat=37.5512, lng=126.9882,
    ))

    session.add(SubwayStation(name="광화문", line="5호선", lat=37.5710, lng=126.9769))
    session.add(SubwayStation(name="경복궁", line="3호선", lat=37.5759, lng=126.9735))
    session.commit()

    def _override():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
