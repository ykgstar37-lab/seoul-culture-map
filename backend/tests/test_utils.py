from app.utils import haversine


def test_haversine_same_point():
    assert haversine(37.5665, 126.978, 37.5665, 126.978) == 0.0


def test_haversine_known_distance():
    # Seoul City Hall to Gangnam Station: ~9.5km
    dist = haversine(37.5665, 126.978, 37.4979, 127.0276)
    assert 8.0 < dist < 10.0


def test_haversine_symmetry():
    d1 = haversine(37.5665, 126.978, 37.4979, 127.0276)
    d2 = haversine(37.4979, 127.0276, 37.5665, 126.978)
    assert abs(d1 - d2) < 0.001
