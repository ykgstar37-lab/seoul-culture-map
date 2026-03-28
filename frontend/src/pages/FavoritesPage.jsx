import { useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import useFavorites from "../hooks/useFavorites";
import { SEOUL_CENTER, CATEGORY_COLORS } from "../constants";

function makeIcon(category, active) {
  const color = CATEGORY_COLORS[category] || "#6b7280";
  const size = active ? 32 : 24;
  const border = active ? "3px solid #facc15" : "2px solid #fff";
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
    </div>`,
    className: "!bg-transparent !border-none !shadow-none",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FlyTo({ coords }) {
  const map = useMap();
  if (coords) map.flyTo(coords, 15, { duration: 0.8 });
  return null;
}

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const [activeId, setActiveId] = useState(null);
  const [mobilePanel, setMobilePanel] = useState(false);

  const activeFav = favorites.find((f) => f.id === activeId);
  const flyCoords = activeFav?.lat && activeFav?.lng ? [activeFav.lat, activeFav.lng] : null;

  const glassCard = "bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl";

  const listContent = (
    <>
      <div className={`${glassCard} px-5 py-4`}>
        <h1 className="text-lg font-bold text-gray-900">Favorites</h1>
        <p className="text-[11px] text-gray-500">
          {favorites.length > 0
            ? `${favorites.length}개 시설 저장됨 — 클릭하면 지도에서 확인`
            : "저장한 시설 및 AI 코스 추천"}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className={`${glassCard} p-10 text-center`}>
          <svg className="w-14 h-14 text-gray-300/60 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-sm text-gray-500">저장된 시설이 없습니다</p>
          <p className="text-[11px] text-gray-400 mt-1">Culture Map에서 시설을 클릭하고</p>
          <p className="text-[11px] text-gray-400">하트를 눌러 저장하세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {favorites.map((f) => {
            const isActive = activeId === f.id;
            const catColor = CATEGORY_COLORS[f.category] || "#6b7280";
            return (
              <button
                key={f.id}
                onClick={() => { setActiveId(isActive ? null : f.id); setMobilePanel(false); }}
                className={`${glassCard} p-3 text-left transition-all ${
                  isActive ? "ring-2 ring-yellow-400 bg-white/50" : "hover:bg-white/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: catColor }}
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}>
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-800 block truncate">{f.name}</span>
                    <span className="text-[10px] text-gray-400">{f.category} · {f.district}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(f); }}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50/60 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

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
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {flyCoords && <FlyTo coords={flyCoords} />}

          {favorites
            .filter((f) => f.lat && f.lng)
            .map((f) => {
              const isActive = activeId === f.id;
              return (
                <Marker
                  key={f.id}
                  position={[f.lat, f.lng]}
                  icon={makeIcon(f.category, isActive)}
                  eventHandlers={{ click: () => setActiveId(f.id) }}
                >
                  <Tooltip direction="top" offset={[0, -16]}>
                    <div className="text-center">
                      <span className="text-xs font-bold block">{f.name}</span>
                      <span className="text-[10px] text-gray-500">{f.category} · {f.district}</span>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
        </MapContainer>
      </div>

      {/* Floating UI */}
      <div className="relative z-10 pointer-events-none w-full h-full flex flex-col p-2 md:p-4 gap-2 md:gap-4">
        <div className="pointer-events-auto"><Navbar /></div>

        <div className="flex-1 flex justify-end min-h-0">
          {/* Desktop right panel */}
          <aside className="pointer-events-auto w-[340px] flex-shrink-0 hidden md:flex flex-col gap-3 overflow-y-auto">
            {listContent}
          </aside>
        </div>
      </div>

      {/* Mobile bottom toggle */}
      <button
        onClick={() => setMobilePanel((v) => !v)}
        className={`md:hidden fixed bottom-4 left-2 right-2 z-20 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all pointer-events-auto ${
          mobilePanel ? "bg-yellow-400 text-gray-900" : "bg-white/80 backdrop-blur-xl text-gray-700"
        }`}
      >
        {mobilePanel ? "닫기" : `즐겨찾기 (${favorites.length})`}
      </button>

      {/* Mobile slide-up panel */}
      {mobilePanel && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-xl border-t border-white/40 rounded-t-2xl shadow-xl max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800">즐겨찾기</h3>
              <button
                onClick={() => setMobilePanel(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {listContent}
          </div>
        </div>
      )}
    </div>
  );
}
