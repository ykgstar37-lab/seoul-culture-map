import axios from "axios";
import { DISTRICT_COORDS } from "../constants";

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
