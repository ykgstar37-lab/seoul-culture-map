import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import Navbar from "../components/Navbar";
import { fetchClusters, fetchDistricts, fetchStats, fetchSubwayStations } from "../api/client";

const SEOUL_CENTER = [37.5665, 126.978];

const PIE_COLORS = ["#facc15", "#1f2937", "#9ca3af", "#f97316", "#3b82f6", "#10b981"];
const CLUSTER_COLORS = ["#facc15", "#3b82f6", "#9ca3af", "#f97316"];

const REGIONS = {
  "도심권": { color: "#ef4444", districts: ["종로구", "중구", "용산구"] },
  "동북권": { color: "#3b82f6", districts: ["성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구"] },
  "서북권": { color: "#22c55e", districts: ["은평구", "서대문구", "마포구"] },
  "서남권": { color: "#f59e0b", districts: ["양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구"] },
  "동남권": { color: "#8b5cf6", districts: ["서초구", "강남구", "송파구", "강동구"] },
};

function getRegion(name) {
  for (const [region, info] of Object.entries(REGIONS)) {
    if (info.districts.includes(name)) return region;
  }
  return null;
}

const CATEGORY_COLORS = {
  "관광지": "#f97316",
  "문화시설": "#6366f1",
  "공연시설": "#ec4899",
  "박물관/유적지": "#8b5cf6",
  "공원": "#22c55e",
  "레포츠": "#eab308",
};

function intensityColor(value, max) {
  const t = max > 0 ? value / max : 0;
  const r = Math.round(250 - t * 10);
  const g = Math.round(220 - t * 180);
  const b = Math.round(100 - t * 80);
  return `rgb(${r},${g},${b})`;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AnalysisMarkers({ districts, mode, heatmapCategory, clusters, selectedDistrict, onSelect, subwayStations, accessibilityScores }) {
  const maxCatValue = useMemo(() => {
    if (mode !== "heatmap" || !heatmapCategory) return 1;
    return Math.max(1, ...districts.map((d) => (d.categories || {})[heatmapCategory] || 0));
  }, [districts, mode, heatmapCategory]);

  return (
    <>
      {districts.map((d) => {
        const isSelected = selectedDistrict === d.name;
        const region = getRegion(d.name);
        const regionInfo = region ? REGIONS[region] : null;

        let fillColor, radius, label;

        if (mode === "region") {
          fillColor = regionInfo?.color || "#9ca3af";
          radius = Math.max(18, Math.min(35, d.total / 6));
          label = d.total;
        } else if (mode === "heatmap") {
          const catVal = (d.categories || {})[heatmapCategory] || 0;
          fillColor = intensityColor(catVal, maxCatValue);
          radius = Math.max(14, Math.min(40, 14 + (catVal / maxCatValue) * 26));
          label = catVal;
        } else if (mode === "accessibility") {
          const score = accessibilityScores[d.name] || 0;
          const maxScore = Math.max(1, ...Object.values(accessibilityScores));
          const t = score / maxScore;
          const r = Math.round(239 - t * 200);
          const g = Math.round(68 + t * 150);
          const b = Math.round(68);
          fillColor = `rgb(${r},${g},${b})`;
          radius = Math.max(16, Math.min(38, 16 + t * 22));
          label = score;
        } else {
          fillColor = "#facc15";
          if (clusters.length > 0) {
            clusters.forEach((c, i) => {
              if ((c.districts || []).includes(d.name)) {
                fillColor = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
              }
            });
          }
          radius = Math.max(18, Math.min(35, d.total / 6));
          label = d.total;
        }

        return (
          <CircleMarker
            key={d.name}
            center={[d.lat, d.lng]}
            radius={radius}
            pathOptions={{
              fillColor,
              fillOpacity: isSelected ? 0.95 : 0.8,
              color: isSelected ? "#000" : "#fff",
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{ click: () => onSelect(d.name) }}
          >
            <Tooltip
              permanent
              direction="center"
              className="!bg-transparent !border-none !shadow-none !p-0"
            >
              <span className={`font-bold text-xs drop-shadow-sm ${isSelected ? "text-white" : "text-gray-800"}`}>
                {label}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function RegionSummaryOverlay({ districts, categoryLabels }) {
  const regionData = useMemo(() => {
    return Object.entries(REGIONS).map(([name, info]) => {
      const regionDistricts = districts.filter((d) => info.districts.includes(d.name));
      const total = regionDistricts.reduce((s, d) => s + d.total, 0);
      const topCat = {};
      regionDistricts.forEach((d) => {
        Object.entries(d.categories || {}).forEach(([cat, cnt]) => {
          topCat[cat] = (topCat[cat] || 0) + cnt;
        });
      });
      const sorted = Object.entries(topCat).sort((a, b) => b[1] - a[1]);
      const lat = regionDistricts.reduce((s, d) => s + d.lat, 0) / (regionDistricts.length || 1);
      const lng = regionDistricts.reduce((s, d) => s + d.lng, 0) / (regionDistricts.length || 1);
      return { name, color: info.color, total, topCategories: sorted.slice(0, 3), lat, lng, districtCount: regionDistricts.length };
    });
  }, [districts]);

  return (
    <div className="absolute bottom-4 left-2 md:left-4 z-[1000] flex flex-wrap gap-2 max-w-[calc(100vw-1rem)] md:max-w-[600px]">
      {regionData.map((r) => (
        <div
          key={r.name}
          className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-xl shadow-lg px-2.5 py-1.5 md:px-3 md:py-2 min-w-[120px] md:min-w-[140px]"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-[10px] md:text-xs font-bold text-gray-800">{r.name}</span>
            <span className="text-[10px] text-gray-400 ml-auto">{r.districtCount}구</span>
          </div>
          <p className="text-[10px] md:text-[11px] text-gray-600 font-semibold mb-1">총 {r.total}개 시설</p>
          <div className="space-y-0.5">
            {r.topCategories.map(([cat, cnt]) => {
              const catColor = CATEGORY_COLORS[cat] || "#9ca3af";
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                  <span className="text-[10px] text-gray-500">{cat}</span>
                  <span className="text-[10px] font-semibold text-gray-700 ml-auto">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatmapLegend({ category, districts }) {
  const max = useMemo(() => {
    return Math.max(1, ...districts.map((d) => (d.categories || {})[category] || 0));
  }, [districts, category]);

  return (
    <div className="absolute bottom-4 left-2 md:left-4 z-[1000] bg-white/40 backdrop-blur-xl border border-white/40 rounded-xl shadow-lg px-3 py-2 md:px-4 md:py-3">
      <p className="text-xs font-bold text-gray-700 mb-2">{category} 시설 밀도</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">0</span>
        <div
          className="h-3 w-24 md:w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, ${intensityColor(0, max)}, ${intensityColor(max * 0.5, max)}, ${intensityColor(max, max)})`,
          }}
        />
        <span className="text-[10px] text-gray-500">{max}</span>
      </div>
    </div>
  );
}

function DistrictDetail({ district, categoryLabels, onClose }) {
  if (!district) return null;
  const cats = district.categories || {};
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="absolute top-20 right-2 md:right-4 z-[1000] bg-white/40 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-4 w-[240px] md:w-[260px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">{district.name}</h3>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-gray-100/60 hover:bg-gray-200 flex items-center justify-center text-gray-500">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">총 {district.total}개 시설</p>
      <div className="space-y-1.5">
        {sorted.map(([cat, cnt]) => {
          const catColor = CATEGORY_COLORS[cat] || "#9ca3af";
          return (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
              <span className="text-[11px] text-gray-600 w-16 truncate">{cat}</span>
              <div className="flex-1 h-4 bg-gray-100/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(cnt / max) * 100}%`, backgroundColor: catColor }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-700 w-6 text-right">{cnt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [clusters, setClusters] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [stats, setStats] = useState(null);
  const [subwayStations, setSubwayStations] = useState([]);
  const [mode, setMode] = useState("cluster");
  const [heatmapCategory, setHeatmapCategory] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [mobilePanel, setMobilePanel] = useState(false);

  const categoryLabels = useMemo(() => {
    const cats = new Set();
    districts.forEach((d) => {
      Object.keys(d.categories || {}).forEach((c) => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [districts]);

  useEffect(() => {
    (async () => {
      const [clusterData, districtData, statsData, subwayData] = await Promise.all([
        fetchClusters(), fetchDistricts(), fetchStats(), fetchSubwayStations(),
      ]);
      setClusters(clusterData.clusters || []);
      setDistricts(districtData);
      setStats(statsData);
      setSubwayStations(subwayData);
      if (districtData.length >= 2) {
        setCompareA(districtData[0].name);
        setCompareB(districtData[1].name);
      }
    })();
  }, []);

  useEffect(() => {
    if (categoryLabels.length > 0 && !heatmapCategory) {
      setHeatmapCategory(categoryLabels[0]);
    }
  }, [categoryLabels, heatmapCategory]);

  const selectedDistrictData = districts.find((d) => d.name === selectedDistrict);

  const accessibilityScores = useMemo(() => {
    const scores = {};
    districts.forEach((d) => {
      const nearby = subwayStations.filter(
        (s) => s.lat && s.lng && haversine(d.lat, d.lng, s.lat, s.lng) < 1.5
      );
      scores[d.name] = nearby.length;
    });
    return scores;
  }, [districts, subwayStations]);

  const radarData = useMemo(() => {
    const a = districts.find((d) => d.name === compareA);
    const b = districts.find((d) => d.name === compareB);
    return categoryLabels.map((cat) => ({
      category: cat,
      [compareA || "A"]: a ? (a.categories || {})[cat] || 0 : 0,
      [compareB || "B"]: b ? (b.categories || {})[cat] || 0 : 0,
    }));
  }, [districts, compareA, compareB, categoryLabels]);

  const pieData = useMemo(() => {
    if (!districts.length) return [];
    const totals = {};
    categoryLabels.forEach((c) => { totals[c] = 0; });
    districts.forEach((d) => {
      categoryLabels.forEach((cat) => {
        totals[cat] += (d.categories || {})[cat] || 0;
      });
    });
    return categoryLabels.map((cat) => ({ name: cat, value: totals[cat] }));
  }, [districts, categoryLabels]);

  const glassCard = "bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl";

  const MODES = [
    { id: "cluster", label: "군집분석", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { id: "region", label: "권역별", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
    { id: "heatmap", label: "카테고리 밀도", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
    { id: "accessibility", label: "지하철 접근성", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  ];

  /* Sidebar content (shared between desktop sidebar and mobile panel) */
  const sidebarContent = (
    <>
      {/* Title */}
      <div className={`${glassCard} px-4 py-3`}>
        <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
        <p className="text-[11px] text-gray-500">지도 위 분석 — 자치구 클릭으로 상세 확인</p>
      </div>

      {/* Mode selector */}
      <div className={`${glassCard} p-4`}>
        <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">분석 모드</p>
        <div className="flex flex-col gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m.id
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "bg-white/40 text-gray-600 hover:bg-white/70"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
              </svg>
              {m.label}
            </button>
          ))}
        </div>

        {mode === "heatmap" && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-gray-400 mb-1.5">카테고리 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryLabels.map((cat) => {
                const isActive = heatmapCategory === cat;
                const catColor = CATEGORY_COLORS[cat] || "#9ca3af";
                return (
                  <button
                    key={cat}
                    onClick={() => setHeatmapCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      isActive ? "text-white shadow-sm" : "bg-white/50 text-gray-500 hover:bg-white/80"
                    }`}
                    style={isActive ? { backgroundColor: catColor } : undefined}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "cluster" && clusters.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400">군집 범례</p>
            {clusters.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                <span className="text-[11px] text-gray-700 font-medium">{c.name || `군집 ${i + 1}`}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{(c.districts || []).length}구</span>
              </div>
            ))}
          </div>
        )}

        {mode === "accessibility" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400">접근성 랭킹 (반경 1.5km 역 수)</p>
            {districts
              .map((d) => ({ name: d.name, score: accessibilityScores[d.name] || 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 10)
              .map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500 w-4">{i + 1}</span>
                  <span className="text-[11px] text-gray-700 font-medium flex-1">{d.name}</span>
                  <span className="text-[11px] font-bold text-green-600">{d.score}역</span>
                </div>
              ))}
          </div>
        )}

        {mode === "region" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-400">권역 범례</p>
            {Object.entries(REGIONS).map(([name, info]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="text-[11px] text-gray-700 font-medium">{name}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{info.districts.length}구</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Radar */}
      <div className={`${glassCard} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-800">자치구 비교</h2>
        </div>
        <div className="flex gap-2 mb-2">
          <select
            value={compareA}
            onChange={(e) => setCompareA(e.target.value)}
            className="flex-1 text-[11px] bg-white/40 border border-white/40 rounded-lg px-2 py-1.5 text-gray-700 outline-none"
          >
            {districts.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
          <span className="text-[10px] text-gray-400 self-center">vs</span>
          <select
            value={compareB}
            onChange={(e) => setCompareB(e.target.value)}
            className="flex-1 text-[11px] bg-white/40 border border-white/40 rounded-lg px-2 py-1.5 text-gray-700 outline-none"
          >
            {districts.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
            <PolarGrid stroke="#d1d5db" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fill: "#1f2937" }} />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: "#9ca3af" }} />
            <Radar name={compareA} dataKey={compareA || "A"} stroke="#facc15" fill="#facc15" fillOpacity={0.3} isAnimationActive={false} />
            <Radar name={compareB} dataKey={compareB || "B"} stroke="#1f2937" fill="#1f2937" fillOpacity={0.2} isAnimationActive={false} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie */}
      <div className={`${glassCard} p-4`}>
        <h2 className="text-xs font-bold text-gray-800 mb-2 text-center">전체 카테고리 분포</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              isAnimationActive={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen interactive map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={SEOUL_CENTER}
          zoom={11}
          className="w-full h-full"
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <AnalysisMarkers
            districts={districts}
            mode={mode}
            heatmapCategory={heatmapCategory}
            clusters={clusters}
            selectedDistrict={selectedDistrict}
            onSelect={(name) => setSelectedDistrict(name === selectedDistrict ? null : name)}
            subwayStations={subwayStations}
            accessibilityScores={accessibilityScores}
          />
        </MapContainer>
      </div>

      {/* Map overlays — bottom left */}
      {mode === "region" && <RegionSummaryOverlay districts={districts} categoryLabels={categoryLabels} />}
      {mode === "heatmap" && <HeatmapLegend category={heatmapCategory} districts={districts} />}
      {mode === "accessibility" && (
        <div className="absolute bottom-4 left-2 md:left-4 z-[1000] bg-white/40 backdrop-blur-xl border border-white/40 rounded-xl shadow-lg px-3 py-2 md:px-4 md:py-3 max-w-[calc(100vw-1rem)] md:max-w-[500px]">
          <p className="text-xs font-bold text-gray-700 mb-2">지하철 접근성 (반경 1.5km 내 역 수)</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500">적음</span>
            <div className="h-3 w-24 md:w-32 rounded-full" style={{ background: "linear-gradient(to right, #ef4444, #f59e0b, #22c55e)" }} />
            <span className="text-[10px] text-gray-500">많음</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {districts
              .map((d) => ({ name: d.name, score: accessibilityScores[d.name] || 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((d, i) => (
                <span key={d.name} className="text-[10px] text-gray-600">
                  <span className="font-bold">{i + 1}.</span> {d.name} <span className="font-semibold text-green-600">{d.score}역</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* District detail on click */}
      {selectedDistrictData && (
        <DistrictDetail
          district={selectedDistrictData}
          categoryLabels={categoryLabels}
          onClose={() => setSelectedDistrict(null)}
        />
      )}

      {/* Floating UI */}
      <div className="relative z-10 pointer-events-none w-full h-full flex flex-col p-2 md:p-4 gap-2 md:gap-4">
        {/* Navbar */}
        <div className="pointer-events-auto">
          <Navbar />
        </div>

        {/* Main content row — desktop sidebar */}
        <div className="flex-1 flex gap-4 min-h-0">
          <aside className="pointer-events-auto w-[320px] flex-shrink-0 hidden md:flex flex-col gap-3 overflow-y-auto">
            {sidebarContent}
          </aside>
          <div className="flex-1" />
        </div>
      </div>

      {/* Mobile bottom toggle */}
      <button
        onClick={() => setMobilePanel((v) => !v)}
        className={`md:hidden fixed bottom-4 left-2 right-2 z-20 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all pointer-events-auto ${
          mobilePanel ? "bg-yellow-400 text-gray-900" : "bg-white/80 backdrop-blur-xl text-gray-700"
        }`}
      >
        {mobilePanel ? "닫기" : "분석 패널"}
      </button>

      {/* Mobile slide-up panel */}
      {mobilePanel && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-xl border-t border-white/40 rounded-t-2xl shadow-xl max-h-[65vh] overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">분석 패널</h3>
              <button
                onClick={() => setMobilePanel(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </div>
  );
}
