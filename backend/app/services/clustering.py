"""
K-means clustering service for Seoul's 25 districts
based on their cultural facility distribution across 6 categories.
"""
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.facility import Facility

CATEGORIES = ["영화관", "공연시설", "박물관/유적지", "방탈출", "공원", "전통사찰"]

# Descriptive names mapped by dominant category patterns
CLUSTER_NAME_MAP = {
    "공연시설": "문화·공연 중심",
    "박물관/유적지": "문화·공연 중심",
    "방탈출": "액티비티·레저 중심",
    "영화관": "액티비티·레저 중심",
    "공원": "자연·역사 중심",
    "전통사찰": "자연·역사 중심",
}


def _assign_cluster_name(centroid: np.ndarray, used_names: set[str]) -> tuple[str, list[str]]:
    """Assign a descriptive name to a cluster based on its centroid values."""
    # Pair each category with its centroid value
    cat_scores = list(zip(CATEGORIES, centroid))
    cat_scores.sort(key=lambda x: x[1], reverse=True)

    dominant_categories = [cat for cat, _ in cat_scores[:2]]

    # Try to pick a name based on the top category
    for cat, _ in cat_scores:
        candidate = CLUSTER_NAME_MAP.get(cat, "균형형")
        if candidate not in used_names:
            used_names.add(candidate)
            return candidate, dominant_categories

    # Fallback
    if "균형형" not in used_names:
        used_names.add("균형형")
        return "균형형", dominant_categories

    # If all names are used, append a suffix
    name = f"균형형 ({len(used_names) + 1})"
    used_names.add(name)
    return name, dominant_categories


def compute_clusters(db: Session, n_clusters: int = 4) -> dict:
    """
    Run K-means clustering on the 25 districts × 6 categories feature matrix.

    Returns:
        {
            "clusters": [
                {"id": 0, "name": "...", "districts": [...], "dominant_categories": [...]},
                ...
            ],
            "district_labels": {"강남구": 0, ...}
        }
    """
    # Build feature matrix from DB
    rows = db.query(Facility).all()

    district_data: dict[str, dict[str, int]] = {}
    for row in rows:
        district_data.setdefault(row.district, {})[row.category] = row.count

    districts = sorted(district_data.keys())
    if not districts:
        return {"clusters": [], "district_labels": {}}

    # Build matrix: rows = districts, cols = categories
    matrix = []
    for district in districts:
        feature_vec = [district_data.get(district, {}).get(cat, 0) for cat in CATEGORIES]
        matrix.append(feature_vec)

    X = np.array(matrix, dtype=float)

    # Normalize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    # Inverse-transform centroids to original scale for interpretation
    centroids_original = scaler.inverse_transform(kmeans.cluster_centers_)

    # Build result
    district_labels = {district: int(label) for district, label in zip(districts, labels)}

    # Group districts by cluster
    cluster_districts: dict[int, list[str]] = {}
    for district, label in district_labels.items():
        cluster_districts.setdefault(label, []).append(district)

    # Assign names
    used_names: set[str] = set()
    clusters = []
    for cluster_id in range(n_clusters):
        centroid = centroids_original[cluster_id]
        name, dominant_cats = _assign_cluster_name(centroid, used_names)
        clusters.append({
            "id": cluster_id,
            "name": name,
            "districts": sorted(cluster_districts.get(cluster_id, [])),
            "dominant_categories": dominant_cats,
        })

    return {
        "clusters": clusters,
        "district_labels": district_labels,
    }
