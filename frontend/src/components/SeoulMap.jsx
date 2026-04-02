import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap, Polyline, Marker, GeoJSON } from "react-leaflet";
import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import { fetchPlaces } from "../api/client";
import { SEOUL_CENTER, CATEGORY_COLORS } from "../constants";
const ZOOM = 11;

const CLUSTER_COLORS = ["#facc15", "#3b82f6", "#9ca3af", "#f97316"];

function SearchOverlay({ value, onChange }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="자치구 검색..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/30 backdrop-blur-xl border border-white/40 rounded-xl shadow-sm text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>
    </div>
  );
}

function MapToggleButtons({ showHeatmap, onToggleHeatmap, showCluster, onToggleCluster }) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex gap-2">
      <button
        onClick={onToggleHeatmap}
        className={`px-3 py-2 rounded-xl shadow-xl text-xs font-semibold transition-all ${
          showHeatmap
            ? "bg-yellow-400 text-gray-900"
            : "bg-white/30 backdrop-blur-xl border border-white/40 text-gray-600 hover:bg-white/70"
        }`}
      >
        <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
        밀집도
      </button>
      <button
        onClick={onToggleCluster}
        className={`px-3 py-2 rounded-xl shadow-xl text-xs font-semibold transition-all ${
          showCluster
            ? "bg-yellow-400 text-gray-900"
            : "bg-white/30 backdrop-blur-xl border border-white/40 text-gray-600 hover:bg-white/70"
        }`}
      >
        <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        군집분석
      </button>
    </div>
  );
}

function ClusterLegend({ clusterLabels }) {
  const entries = Object.entries(clusterLabels);
  if (entries.length === 0) return null;

  return (
    <div className="absolute bottom-6 right-4 z-[1000] bg-white/30 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">군집 범례</p>
      <div className="space-y-1.5">
        {entries.map(([label], i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block border border-white/60"
              style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapLayer({ districts }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet.heat").then(() => {
      if (cancelled) return;
      const L = window.L;
      const points = districts.map((d) => [d.lat, d.lng, d.total / 3]);
      layerRef.current = L.heatLayer(points, {
        radius: 40,
        blur: 30,
        maxZoom: 14,
        gradient: { 0.2: "#3b82f6", 0.4: "#8b5cf6", 0.6: "#f59e0b", 0.8: "#ef4444", 1: "#dc2626" },
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, districts]);

  return null;
}

const LINE_COLORS = {
  "1호선": "#0052A4", "2호선": "#009B3E", "3호선": "#EF7C1C", "4호선": "#00A5DE",
  "5호선": "#996CAC", "6호선": "#CD7C2F", "7호선": "#747F00", "8호선": "#E6186C",
  "9호선": "#BDB092", "신분당선": "#D4003B", "경의중앙선": "#77C4A3", "분당선": "#F5A200",
  "경춘선": "#178C72", "공항철도1호선": "#0090D2", "우이신설선": "#B7C452", "신림선": "#6789CA",
  "김포골드라인": "#A17E46", "서해선": "#8CC63F", "의정부선": "#FDA600",
  "경원선": "#77C4A3", "경부선": "#0052A4", "경인선": "#0052A4", "수인선": "#F5A200",
  "안산선": "#00A5DE", "과천선": "#00A5DE", "일산선": "#77C4A3", "중앙선": "#77C4A3",
};

function getLineColor(line) {
  for (const [key, color] of Object.entries(LINE_COLORS)) {
    if (line && line.includes(key.replace("호선", ""))) return color;
  }
  return "#9ca3af";
}

function SubwayLayer({ stations, selectedDistrict, districts, selectedLine }) {
  const lineGroups = useMemo(() => {
    const groups = {};
    stations.filter(s => s.lat && s.lng).forEach(s => {
      const line = s.line || "기타";
      if (!groups[line]) groups[line] = [];
      groups[line].push(s);
    });
    return groups;
  }, [stations]);

  const visibleStations = useMemo(() => {
    const result = [];
    stations.forEach((s, i) => {
      if (!s.lat || !s.lng) return;
      let show = false;
      if (selectedLine && s.line && (s.line === selectedLine || s.line.startsWith(selectedLine))) show = true;
      if (selectedDistrict) {
        const dist = districts.find(d => d.name === selectedDistrict);
        if (dist) {
          const dlat = s.lat - dist.lat;
          const dlng = s.lng - dist.lng;
          if (Math.sqrt(dlat * dlat + dlng * dlng) < 0.025) show = true;
        }
      }
      if (show) result.push({ ...s, idx: i });
    });
    return result;
  }, [stations, selectedDistrict, districts, selectedLine]);

  return (
    <>
      {/* Lines — always visible, highlighted when selected */}
      {Object.entries(lineGroups).map(([line, stns]) => {
        const color = getLineColor(line);
        const isActive = selectedLine && (line === selectedLine || line.startsWith(selectedLine));
        const positions = stns.map(s => [s.lat, s.lng]);
        return (
          <Polyline
            key={`line-${line}`}
            positions={positions}
            pathOptions={{
              color,
              weight: isActive ? 5 : 2,
              opacity: isActive ? 0.85 : 0.1,
            }}
          />
        );
      })}
      {/* Station pin markers — only for selected line or district */}
      {visibleStations.map((s) => {
        const color = getLineColor(s.line);
        const icon = L.divIcon({
          html: `<div style="display:flex;align-items:center;justify-content:center;"><svg width="16" height="22" viewBox="0 0 16 22"><path d="M8 0C3.6 0 0 3.6 0 8c0 6 8 14 8 14s8-8 8-14c0-4.4-3.6-8-8-8z" fill="${color}"/><circle cx="8" cy="8" r="3" fill="white"/></svg></div>`,
          className: "!bg-transparent !border-none !shadow-none",
          iconSize: [16, 22],
          iconAnchor: [8, 22],
        });
        return (
          <Marker
            key={`stn-${s.name}-${s.idx}`}
            position={[s.lat, s.lng]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -22]}>
              <div className="text-center">
                <span className="text-[11px] font-bold block">{s.name}</span>
                <span className="text-[10px] font-medium" style={{ color }}>{s.line}</span>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

const CATEGORY_ICON_SVG = {
  "관광지": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>`,
  "문화시설": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"/></svg>`,
  "공연시설": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M9 19V6l12-3v13M9 19c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zm12-3c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2z"/></svg>`,
  "박물관": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>`,
  "박물관/유적지": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>`,
  "유적지": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 3L2 12h3v8h14v-8h3L12 3zM9 21v-6h6v6"/></svg>`,
  "공원": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M5 20h14M12 4l-5 8h3l-2 4h8l-2-4h3L12 4z"/></svg>`,
  "레포츠": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
};

function makeCategoryIcon(category) {
  const color = CATEGORY_COLORS[category] || "#6b7280";
  const svg = CATEGORY_ICON_SVG[category] || CATEGORY_ICON_SVG["관광지"];
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${svg}</div>`,
    className: "!bg-transparent !border-none !shadow-none",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function DistrictBoundary({ selectedDistrict }) {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch("/seoul-districts.json")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(() => {});
  }, []);

  const selectedFeature = useMemo(() => {
    if (!geoData || !selectedDistrict) return null;
    const feature = geoData.features.find(
      (f) => f.properties.name === selectedDistrict
    );
    if (!feature) return null;
    return { type: "FeatureCollection", features: [feature] };
  }, [geoData, selectedDistrict]);

  if (!selectedFeature) return null;

  return (
    <GeoJSON
      key={selectedDistrict}
      data={selectedFeature}
      style={{
        color: "#1a1a1a",
        weight: 3,
        fillColor: "#facc15",
        fillOpacity: 0.1,
        dashArray: "6 3",
      }}
    />
  );
}

function getMarkerColor(total) {
  if (total >= 200) return "#facc15";
  if (total >= 100) return "#fbbf24";
  return "#fcd34d";
}

function makeNumberIcon(num) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#6366f1;color:white;
      display:flex;align-items:center;justify-content:center;
      font-weight:bold;font-size:13px;
      border:2px solid white;box-shadow:0 2px 8px rgba(99,102,241,0.5);
      animation:pulse 2s infinite;
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function HighlightedPlaces({ places, onClear }) {
  const map = useMap();

  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [places, map]);

  if (places.length === 0) return null;

  const polylinePositions = places.map((p) => [p.lat, p.lng]);

  return (
    <>
      <Polyline
        positions={polylinePositions}
        pathOptions={{ color: "#6366f1", weight: 3, dashArray: "8 6", opacity: 0.7 }}
      />
      {places.map((p, i) => (
        <Marker key={`hl-${p.id}`} position={[p.lat, p.lng]} icon={makeNumberIcon(i + 1)}>
          <Tooltip direction="top" offset={[0, -16]}>
            <span className="text-xs font-bold">{p.name}</span>
            <br />
            <span className="text-[10px] text-gray-500">{p.category}</span>
          </Tooltip>
        </Marker>
      ))}
      {/* Clear button */}
      <div className="leaflet-top leaflet-left" style={{ top: "60px", left: "50%", transform: "translateX(-50%)", position: "absolute", zIndex: 1000 }}>
        <button
          onClick={onClear}
          className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg hover:bg-indigo-600 transition-colors"
        >
          AI 추천 마커 지우기
        </button>
      </div>
    </>
  );
}

export default function SeoulMap({
  districts,
  selectedDistrict,
  onSelectDistrict,
  searchQuery,
  onSearchChange,
  selectedCategories,
  subwayStations = [],
  clusterColors = {},
  showCluster = false,
  onToggleCluster,
  selectedLine = null,
  onToggleFavorite,
  isFavorite,
  highlightedPlaces = [],
  onClearHighlights,
}) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [places, setPlaces] = useState([]);

  // Category ID → API category name mapping
  const CAT_ID_TO_NAME = {
    tourism: "관광지", culture: "문화시설", performance: "공연시설",
    museum: "박물관", heritage: "유적지", park: "공원", sports: "레포츠",
  };

  useEffect(() => {
    if (!selectedDistrict && (!selectedCategories || selectedCategories.length === 0)) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const apiCategoryNames = (selectedCategories || []).map(id => CAT_ID_TO_NAME[id]).filter(Boolean);

      let result;
      if (apiCategoryNames.length === 1) {
        // Single category — use server-side filter
        result = await fetchPlaces(selectedDistrict || undefined, apiCategoryNames[0], 500);
      } else if (apiCategoryNames.length > 1) {
        // Multiple categories — fetch each and merge
        const promises = apiCategoryNames.map(cat => fetchPlaces(selectedDistrict || undefined, cat, 500));
        const results = await Promise.all(promises);
        result = results.flat();
      } else {
        // No category filter (district only)
        result = await fetchPlaces(selectedDistrict || undefined, undefined, 500);
      }
      if (!cancelled) setPlaces(Array.isArray(result) ? result : []);
    })();
    return () => { cancelled = true; };
  }, [selectedDistrict, selectedCategories]);

  /* Build cluster legend from clusterColors values */
  const clusterLabels = {};
  if (showCluster && clusterColors) {
    Object.entries(clusterColors).forEach(([district, color]) => {
      const idx = CLUSTER_COLORS.indexOf(color);
      const label = `군집 ${idx + 1}`;
      if (!clusterLabels[label]) clusterLabels[label] = color;
    });
  }

  function getDistrictFill(d) {
    if (selectedDistrict === d.name) return "#1a1a1a";
    if (showCluster && clusterColors[d.name]) return clusterColors[d.name];
    return getMarkerColor(d.total);
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SearchOverlay value={searchQuery} onChange={onSearchChange} />
      <MapToggleButtons
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => { setShowHeatmap(!showHeatmap); }}
        showCluster={showCluster}
        onToggleCluster={onToggleCluster}
      />
      {showCluster && <ClusterLegend clusterLabels={clusterLabels} />}
      <MapContainer
        center={SEOUL_CENTER}
        zoom={ZOOM}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {showHeatmap && <HeatmapLayer districts={districts} />}
        <DistrictBoundary selectedDistrict={selectedDistrict} />
        {!showHeatmap &&
          districts.map((d) => {
            const isSelected = selectedDistrict === d.name;
            const radius = Math.max(18, Math.min(35, d.total / 6));
            return (
              <CircleMarker
                key={d.name}
                center={[d.lat, d.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: getDistrictFill(d),
                  fillOpacity: isSelected ? 0.95 : 0.8,
                  color: isSelected ? "#000000" : "#ffffff",
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => onSelectDistrict(d.name),
                }}
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="!bg-transparent !border-none !shadow-none !p-0"
                >
                  <span className={`font-bold text-xs drop-shadow-sm ${isSelected ? "text-white" : "text-gray-800"}`}>
                    {d.total}
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        {/* Subway lines + stations */}
        <SubwayLayer
          stations={subwayStations}
          selectedDistrict={selectedDistrict}
          districts={districts}
          selectedLine={selectedLine}
        />
        {/* Individual facility markers with category icons */}
        {!showHeatmap &&
          places
            .filter((p) => (p.lat || p.latitude) && (p.lng || p.longitude))
            .map((p, i) => {
              const cat = p.category || "";
              const icon = makeCategoryIcon(cat);
              const placeLat = p.lat || p.latitude;
              const placeLng = p.lng || p.longitude;
              return (
                <Marker
                  key={`place-${p.id || i}`}
                  position={[placeLat, placeLng]}
                  icon={icon}
                >
                  <Tooltip direction="top" offset={[0, -20]}>
                    <span className="text-xs font-bold">{p.name || "시설"}</span>
                  </Tooltip>
                  <Popup offset={[0, -12]} className="!rounded-xl" maxWidth={260}>
                    <div className="min-w-[200px]">
                      {p.image_url && (
                        <div className="w-full h-[120px] -mt-1 -mx-0.5 mb-2 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-800 block truncate">{p.name || "시설"}</span>
                          <span className="text-[11px] text-gray-500 block">{cat} · {p.district || ""}</span>
                        </div>
                        {onToggleFavorite && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(p); }}
                            className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${isFavorite && isFavorite(p.id) ? "text-red-400 fill-red-400" : "text-gray-300"}`}
                              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              fill={isFavorite && isFavorite(p.id) ? "currentColor" : "none"}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {p.address && <p className="text-[10px] text-gray-400 mt-1">{p.address}</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        {/* AI recommended place highlights */}
        <HighlightedPlaces places={highlightedPlaces} onClear={onClearHighlights} />
      </MapContainer>
    </div>
  );
}
