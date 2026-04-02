"""ChromaDB vector store for semantic search over cultural facilities."""

from __future__ import annotations

import logging

import chromadb
from sqlalchemy.orm import Session

from app.models.place import Place

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

COLLECTION_NAME = "seoul_places"
PERSIST_DIR = "./chroma_data"


def init_vectorstore() -> None:
    """Initialize persistent ChromaDB client and collection."""
    global _client, _collection
    _client = chromadb.PersistentClient(path=PERSIST_DIR)
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(
        "ChromaDB initialized: %d documents in collection", _collection.count()
    )


def embed_places(db: Session) -> None:
    """Embed all places into ChromaDB. Skips if already populated."""
    global _collection
    if _collection is None:
        init_vectorstore()

    existing_count = _collection.count()
    place_count = db.query(Place).count()

    # Skip if collection is already up to date (within 10% tolerance)
    if existing_count > 0 and abs(existing_count - place_count) < place_count * 0.1:
        logger.info(
            "ChromaDB already has %d documents (DB has %d), skipping embedding",
            existing_count,
            place_count,
        )
        return

    logger.info("Embedding %d places into ChromaDB...", place_count)

    # Clear existing data for a fresh embed
    if existing_count > 0:
        _client.delete_collection(COLLECTION_NAME)
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    # Process in batches
    batch_size = 200
    offset = 0

    while True:
        places = (
            db.query(Place)
            .order_by(Place.id)
            .offset(offset)
            .limit(batch_size)
            .all()
        )
        if not places:
            break

        ids = []
        documents = []
        metadatas = []

        for p in places:
            # Build rich text representation for embedding
            doc = f"{p.name} — {p.category}"
            if p.district:
                doc += f", {p.district}"
            if p.address:
                doc += f". 주소: {p.address}"

            ids.append(str(p.id))
            documents.append(doc)
            metadatas.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "district": p.district or "",
                "lat": p.lat,
                "lng": p.lng,
            })

        _collection.add(ids=ids, documents=documents, metadatas=metadatas)
        offset += batch_size

    logger.info("ChromaDB embedding complete: %d documents", _collection.count())


def search_places(
    query: str,
    district: str | None = None,
    category: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Semantic search for places matching a natural language query."""
    if _collection is None or _collection.count() == 0:
        return []

    # Build metadata filter
    where = None
    conditions = []
    if district:
        conditions.append({"district": district})
    if category:
        conditions.append({"category": {"$contains": category}})

    if len(conditions) == 1:
        where = conditions[0]
    elif len(conditions) > 1:
        where = {"$and": conditions}

    results = _collection.query(
        query_texts=[query],
        n_results=limit,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    places = []
    if results and results["metadatas"]:
        for meta, distance in zip(results["metadatas"][0], results["distances"][0]):
            places.append({
                "id": meta["id"],
                "name": meta["name"],
                "category": meta["category"],
                "district": meta["district"],
                "lat": meta["lat"],
                "lng": meta["lng"],
                "similarity": round(1 - distance, 3),  # cosine distance → similarity
            })

    return places
