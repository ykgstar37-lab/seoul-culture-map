import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

/* ---------- Mock data (used as fallback when backend is offline) ---------- */

const MOCK_STATS = {
  total: 2847,
  cinema: 312,
  performance: 487,
  museum: 198,
};

const DISTRICT_NAMES = [
  "강남구", "강동구", "강북구", "강서구", "관악구",
  "광진구", "구로구", "금천구", "노원구", "도봉구",
  "동대문구", "동작구", "마포구", "서대문구", "서초구",
  "성동구", "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구",
];

const CATEGORY_LABELS = ["영화관", "공연시설", "박물관/유적지", "방탈출", "공원", "전통사찰"];

const DISTRICT_COORDS = {
  "강남구": [37.5172, 127.0473],
  "강동구": [37.5301, 127.1238],
  "강북구": [37.6396, 127.0256],
  "강서구": [37.5510, 126.8495],
  "관악구": [37.4784, 126.9516],
  "광진구": [37.5385, 127.0823],
  "구로구": [37.4954, 126.8874],
  "금천구": [37.4568, 126.8953],
  "노원구": [37.6542, 127.0568],
  "도봉구": [37.6688, 127.0471],
  "동대문구": [37.5744, 127.0396],
  "동작구": [37.5124, 126.9393],
  "마포구": [37.5663, 126.9014],
  "서대문구": [37.5791, 126.9368],
  "서초구": [37.4837, 127.0324],
  "성동구": [37.5633, 127.0371],
  "성북구": [37.5894, 127.0167],
  "송파구": [37.5145, 127.1050],
  "양천구": [37.5171, 126.8665],
  "영등포구": [37.5264, 126.8963],
  "용산구": [37.5326, 126.9906],
  "은평구": [37.6027, 126.9291],
  "종로구": [37.5735, 126.9790],
  "중구": [37.5641, 126.9979],
  "중랑구": [37.6063, 127.0925],
};

function generateMockDistricts() {
  return DISTRICT_NAMES.map((name, i) => {
    const total = 80 + Math.floor(Math.random() * 150);
    const topCategory = CATEGORY_LABELS[i % CATEGORY_LABELS.length];
    const coords = DISTRICT_COORDS[name] || [37.5665, 126.978];
    return {
      name,
      total,
      topCategory,
      lat: coords[0],
      lng: coords[1],
      categories: {
        "영화관": 10 + Math.floor(Math.random() * 30),
        "공연시설": 15 + Math.floor(Math.random() * 40),
        "박물관/유적지": 5 + Math.floor(Math.random() * 20),
        "방탈출": 3 + Math.floor(Math.random() * 15),
        "공원": 8 + Math.floor(Math.random() * 25),
        "전통사찰": 2 + Math.floor(Math.random() * 10),
      },
    };
  });
}

const MOCK_DISTRICTS = generateMockDistricts();

/* ---------- API functions ---------- */

export async function fetchStats() {
  try {
    const { data } = await api.get("/facilities/stats");
    const catMap = {};
    const counts = data.category_counts || [];
    counts.forEach(c => { catMap[c.category] = c.count; });
    return {
      total: data.total_count || 0,
      categoryCount: counts.length,
      categories: catMap,
    };
  } catch {
    return MOCK_STATS;
  }
}

export async function fetchDistricts() {
  try {
    const { data } = await api.get("/facilities/districts");
    return (data.districts || []).map(d => {
      const cats = {};
      let topCat = "";
      let topCount = 0;
      (d.categories || []).forEach(c => {
        cats[c.category] = c.count;
        if (c.count > topCount) { topCount = c.count; topCat = c.category; }
      });
      return {
        name: d.district,
        total: d.total_count,
        topCategory: topCat,
        lat: d.latitude,
        lng: d.longitude,
        categories: cats,
      };
    });
  } catch {
    return MOCK_DISTRICTS;
  }
}

export async function fetchDistrictDetail(districtName) {
  try {
    const { data } = await api.get(`/facilities/districts/${encodeURIComponent(districtName)}`);
    return data;
  } catch {
    return MOCK_DISTRICTS.find((d) => d.name === districtName) || null;
  }
}

export async function fetchPlaces(district, category, limit = 200) {
  try {
    const params = {};
    if (district) params.district = district;
    if (category) params.category = category;
    if (limit) params.limit = limit;
    const { data } = await api.get("/places", { params });
    return data;
  } catch {
    return [];
  }
}

export async function searchFacilities(query) {
  try {
    const { data } = await api.get("/facilities/search", { params: { q: query } });
    return data;
  } catch {
    return MOCK_DISTRICTS.filter((d) =>
      d.name.includes(query)
    );
  }
}

export async function fetchSubwayStations() {
  try {
    const { data } = await api.get("/subway");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchClusters() {
  try {
    const { data } = await api.get("/clusters");
    return data;
  } catch {
    return { clusters: [], district_labels: {} };
  }
}
