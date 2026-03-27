import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import { fetchDistricts, fetchPlaces } from "../api/client";
import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

const SEOUL_CENTER = [37.5665, 126.978];

const DISTRICT_COORDS = {
  "강남구": [37.5172, 127.0473], "강동구": [37.5301, 127.1238],
  "강북구": [37.6396, 127.0256], "강서구": [37.5510, 126.8495],
  "관악구": [37.4784, 126.9516], "광진구": [37.5385, 127.0823],
  "구로구": [37.4954, 126.8874], "금천구": [37.4568, 126.8953],
  "노원구": [37.6542, 127.0568], "도봉구": [37.6688, 127.0471],
  "동대문구": [37.5744, 127.0396], "동작구": [37.5124, 126.9393],
  "마포구": [37.5663, 126.9014], "서대문구": [37.5791, 126.9368],
  "서초구": [37.4837, 127.0324], "성동구": [37.5633, 127.0371],
  "성북구": [37.5894, 127.0167], "송파구": [37.5145, 127.1050],
  "양천구": [37.5171, 126.8665], "영등포구": [37.5264, 126.8963],
  "용산구": [37.5326, 126.9906], "은평구": [37.6027, 126.9291],
  "종로구": [37.5735, 126.9790], "중구": [37.5641, 126.9979],
  "중랑구": [37.6063, 127.0925],
};

const PURPOSES = [
  {
    id: "performance",
    label: "공연 중심",
    icon: "M9 19V6l12-3v13M9 19c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zm12-3c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2z",
    color: "#ec4899",
    categories: ["공연시설", "문화시설"],
    description: "공연장, 극장, 문화센터 밀집 지역",
  },
  {
    id: "nature",
    label: "자연 힐링",
    icon: "M5 20h14M12 4l-5 8h3l-2 4h8l-2-4h3L12 4z",
    color: "#22c55e",
    categories: ["공원", "레포츠"],
    description: "공원, 자연, 야외 활동 중심",
  },
  {
    id: "history",
    label: "역사 탐방",
    icon: "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
    color: "#8b5cf6",
    categories: ["박물관/유적지", "관광지"],
    description: "박물관, 유적지, 관광 명소",
  },
  {
    id: "activity",
    label: "액티비티",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "#f59e0b",
    categories: ["레포츠", "공원"],
    description: "스포츠, 레저, 체험 활동",
  },
  {
    id: "culture",
    label: "문화 예술",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5",
    color: "#6366f1",
    categories: ["문화시설", "공연시설", "관광지"],
    description: "미술관, 갤러리, 문화공간",
  },
];

const CATEGORY_COLORS = {
  "관광지": "#f97316", "문화시설": "#6366f1", "공연시설": "#ec4899",
  "박물관/유적지": "#8b5cf6", "공원": "#22c55e", "레포츠": "#eab308",
};

function createNumberIcon(number, color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;background:${color};
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:14px;color:#fff;
      border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FlyToDistrict({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 13, { duration: 1 });
  }, [coords, map]);
  return null;
}

export default function CoursePage() {
  const [districts, setDistricts] = useState([]);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState([]);
  const [courseStops, setCourseStops] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchDistricts().then(setDistricts);
  }, []);

  /* Rank districts by purpose */
  const rankedDistricts = useMemo(() => {
    if (!selectedPurpose || !districts.length) return [];
    const purpose = PURPOSES.find((p) => p.id === selectedPurpose);
    if (!purpose) return [];

    return districts
      .map((d) => {
        const cats = d.categories || {};
        const score = purpose.categories.reduce((s, cat) => s + (cats[cat] || 0), 0);
        return { ...d, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [districts, selectedPurpose]);

  /* Fetch places when a district is selected */
  useEffect(() => {
    if (!selectedDistrict) { setPlaces([]); return; }
    let cancelled = false;
    fetchPlaces(selectedDistrict, undefined, 200).then((data) => {
      if (!cancelled) setPlaces(Array.isArray(data) ? data : []);
    });
    return () => { cancelled = true; };
  }, [selectedDistrict]);

  /* Auto-select top district when purpose changes */
  useEffect(() => {
    if (rankedDistricts.length > 0) {
      setSelectedDistrict(rankedDistricts[0].name);
      setRecommendation("");
      setCourseStops([]);
    }
  }, [selectedPurpose]);

  async function handleRecommend() {
    if (!selectedDistrict) return;
    setLoading(true);
    setRecommendation("");
    setCourseStops([]);
    try {
      const { data } = await api.get("/recommend", {
        params: { district: selectedDistrict, lang: "ko" },
      });
      setRecommendation(data.recommendation || data.text || JSON.stringify(data));
      if (data.stops && Array.isArray(data.stops)) setCourseStops(data.stops);
      else if (data.course && Array.isArray(data.course)) setCourseStops(data.course);
    } catch {
      setRecommendation("추천을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const flyCoords = selectedDistrict ? DISTRICT_COORDS[selectedDistrict] : null;
  const purposeData = PURPOSES.find((p) => p.id === selectedPurpose);
  const glassCard = "bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl";

  /* Filter places by purpose categories */
  const filteredPlaces = useMemo(() => {
    if (!purposeData) return places;
    return places.filter((p) => purposeData.categories.includes(p.category));
  }, [places, purposeData]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={SEOUL_CENTER}
          zoom={11}
          className="w-full h-full"
          zoomControl={true}
          scrollWheelZoom={true}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {flyCoords && <FlyToDistrict coords={flyCoords} />}

          {/* Top 5 district markers */}
          {rankedDistricts.map((d, i) => {
            const isSelected = selectedDistrict === d.name;
            return (
              <CircleMarker
                key={d.name}
                center={[d.lat, d.lng]}
                radius={isSelected ? 30 : 22 - i * 2}
                pathOptions={{
                  fillColor: purposeData?.color || "#facc15",
                  fillOpacity: isSelected ? 0.9 : 0.5 - i * 0.07,
                  color: isSelected ? "#000" : "#fff",
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{ click: () => setSelectedDistrict(d.name) }}
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="!bg-transparent !border-none !shadow-none !p-0"
                >
                  <div className="text-center">
                    <span className={`font-bold text-xs drop-shadow-sm ${isSelected ? "text-white" : "text-gray-700"}`}>
                      #{i + 1}
                    </span>
                    <br />
                    <span className={`font-semibold text-[10px] drop-shadow-sm ${isSelected ? "text-white" : "text-gray-600"}`}>
                      {d.name}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Individual place markers */}
          {filteredPlaces
            .filter((p) => (p.lat || p.latitude) && (p.lng || p.longitude))
            .map((p, i) => {
              const catColor = CATEGORY_COLORS[p.category] || "#9ca3af";
              return (
                <CircleMarker
                  key={`place-${p.id || i}`}
                  center={[p.lat || p.latitude, p.lng || p.longitude]}
                  radius={5}
                  pathOptions={{ fillColor: catColor, fillOpacity: 0.7, color: "#fff", weight: 1 }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <span className="text-xs font-medium">{p.name}</span>
                    <br />
                    <span className="text-[10px] text-gray-500">{p.category}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

          {/* Course stop markers */}
          {courseStops
            .filter((s) => s.lat && s.lng)
            .map((stop, i) => (
              <Marker
                key={`course-${i}`}
                position={[stop.lat, stop.lng]}
                icon={createNumberIcon(i + 1, purposeData?.color || "#facc15")}
              >
                <Tooltip direction="top" offset={[0, -18]}>
                  <span className="text-xs font-semibold">{i + 1}. {stop.name || "코스 지점"}</span>
                </Tooltip>
              </Marker>
            ))}

          {/* Course route */}
          {courseStops.length >= 2 && (
            <Polyline
              positions={courseStops.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng])}
              pathOptions={{ color: purposeData?.color || "#facc15", weight: 3, dashArray: "8 4" }}
            />
          )}
        </MapContainer>
      </div>

      {/* Floating UI */}
      <div className="relative z-10 pointer-events-none w-full h-full flex flex-col p-4 gap-4">
        <div className="pointer-events-auto"><Navbar /></div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left panel */}
          <aside className="pointer-events-auto w-[340px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* Title */}
            <div className={`${glassCard} px-4 py-3`}>
              <h1 className="text-lg font-bold text-gray-900">관광 코스 추천</h1>
              <p className="text-[11px] text-gray-500">목적을 선택하면 맞춤 자치구 Top 5가 지도에 표시됩니다</p>
            </div>

            {/* Purpose selector */}
            <div className={`${glassCard} p-4`}>
              <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">관광 목적</p>
              <div className="flex flex-col gap-1.5">
                {PURPOSES.map((p) => {
                  const isActive = selectedPurpose === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPurpose(isActive ? null : p.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                        isActive
                          ? "text-white shadow-md font-bold"
                          : "bg-white/40 text-gray-600 hover:bg-white/70 font-medium"
                      }`}
                      style={isActive ? { backgroundColor: p.color } : undefined}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                      </svg>
                      <div>
                        <span className="block">{p.label}</span>
                        <span className={`block text-[10px] ${isActive ? "text-white/80" : "text-gray-400"}`}>{p.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top 5 ranking */}
            {rankedDistricts.length > 0 && (
              <div className={`${glassCard} p-4`}>
                <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">추천 자치구 Top 5</p>
                <div className="space-y-1.5">
                  {rankedDistricts.map((d, i) => {
                    const isActive = selectedDistrict === d.name;
                    return (
                      <button
                        key={d.name}
                        onClick={() => setSelectedDistrict(d.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                          isActive ? "bg-white/70 shadow-sm" : "hover:bg-white/40"
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: purposeData?.color || "#facc15" }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-800 block">{d.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {purposeData?.categories.map((cat) => `${cat} ${(d.categories || {})[cat] || 0}`).join(" · ")}
                          </span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: purposeData?.color }}>{d.score}</span>
                      </button>
                    );
                  })}
                </div>

                {/* AI recommend button */}
                <button
                  onClick={handleRecommend}
                  disabled={loading || !selectedDistrict}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 text-white"
                  style={{ backgroundColor: purposeData?.color || "#facc15" }}
                >
                  {loading ? "코스 생성 중..." : `${selectedDistrict} AI 코스 추천`}
                </button>
              </div>
            )}

            {/* Recommendation result */}
            {recommendation && (
              <div className={`${glassCard} p-4`}>
                <p className="text-[10px] font-semibold text-gray-400 mb-2">AI 추천 코스</p>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {recommendation}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!selectedPurpose && (
              <div className={`${glassCard} p-8 text-center`}>
                <svg className="w-14 h-14 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm text-gray-400">관광 목적을 선택해주세요</p>
                <p className="text-[11px] text-gray-300 mt-1">목적에 맞는 추천 자치구가 지도에 표시됩니다</p>
              </div>
            )}
          </aside>

          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}
