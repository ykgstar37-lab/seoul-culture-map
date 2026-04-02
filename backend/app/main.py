from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models.chat import ChatMessage, ChatSession  # noqa: F401 — ensure tables are created
from app.models.subway import SubwayStation  # noqa: F401 — ensure table is created
from app.routers.chat import router as chat_router
from app.routers.facility import places_router, router as facility_router
from app.routers.recommend import router as recommend_router
from app.services.data_loader import seed_database
from app.services.seoul_api import sync_from_seoul_api
from app.services.tour_api import sync_from_tour_api
from app.services.vectorstore import embed_places, init_vectorstore


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed data on startup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)  # District-level aggregates for clustering
        try:
            init_vectorstore()
            embed_places(db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("ChromaDB init skipped: %s", e)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Seoul Culture Map API",
    description="API for Seoul cultural facility data across 25 districts",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(facility_router)
app.include_router(places_router)
app.include_router(recommend_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"message": "Seoul Culture Map API", "docs": "/docs"}


@app.post("/api/sync")
async def sync_data():
    """서울 공공데이터 API에서 최신 데이터 수동 갱신"""
    db = SessionLocal()
    try:
        await sync_from_seoul_api(db)
        await sync_from_tour_api(db)
        return {"status": "ok", "message": "Data synced from Seoul Open Data + Tour API"}
    finally:
        db.close()
