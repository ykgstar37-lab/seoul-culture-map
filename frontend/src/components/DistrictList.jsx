import { useState, useMemo } from "react";

/* ── 서울시 5대 권역 ── */
const REGIONS = [
  { id: "all", label: "전체" },
  { id: "도심권", label: "도심권", color: "#ef4444" },
  { id: "동북권", label: "동북권", color: "#3b82f6" },
  { id: "서북권", label: "서북권", color: "#22c55e" },
  { id: "서남권", label: "서남권", color: "#f59e0b" },
  { id: "동남권", label: "동남권", color: "#8b5cf6" },
];

const DISTRICT_REGION = {
  // 도심권
  "종로구": "도심권", "중구": "도심권", "용산구": "도심권",
  // 동북권
  "성동구": "동북권", "광진구": "동북권", "동대문구": "동북권", "중랑구": "동북권",
  "성북구": "동북권", "강북구": "동북권", "도봉구": "동북권", "노원구": "동북권",
  // 서북권
  "은평구": "서북권", "서대문구": "서북권", "마포구": "서북권",
  // 서남권
  "양천구": "서남권", "강서구": "서남권", "구로구": "서남권", "금천구": "서남권",
  "영등포구": "서남권", "동작구": "서남권", "관악구": "서남권",
  // 동남권
  "서초구": "동남권", "강남구": "동남권", "송파구": "동남권", "강동구": "동남권",
};



export default function DistrictList({ districts, selectedDistrict, onSelectDistrict }) {
  const [filterRegion, setFilterRegion] = useState("all");

  const filteredDistricts = useMemo(() => {
    if (filterRegion === "all") return districts;
    return districts.filter((d) => DISTRICT_REGION[d.name] === filterRegion);
  }, [districts, filterRegion]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-800">자치구 시설 목록</h2>
        <span className="text-[11px] text-gray-400 font-medium">{filteredDistricts.length}개 구</span>
      </div>

      {/* Region filter */}
      <div className="mb-2">
        <p className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">권역</p>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((region) => {
            const isActive = filterRegion === region.id;
            return (
              <button
                key={region.id}
                onClick={() => setFilterRegion(isActive && region.id !== "all" ? "all" : region.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  isActive
                    ? "text-white shadow-sm"
                    : "bg-white/50 text-gray-500 hover:bg-white/80"
                }`}
                style={isActive ? { backgroundColor: region.color || "#1f2937" } : undefined}
              >
                {region.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* District cards */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          {filteredDistricts.map((d) => {
            const isSelected = selectedDistrict === d.name;
            const region = DISTRICT_REGION[d.name];
            const rColor = REGIONS.find((r) => r.id === region)?.color || "#9ca3af";

            return (
              <div
                key={d.name}
                className={`relative bg-white/60 backdrop-blur-sm rounded-xl overflow-hidden transition-all cursor-pointer hover:bg-white/80 border ${
                  isSelected ? "border-yellow-400 bg-yellow-50/60" : "border-white/40"
                }`}
                onClick={() => onSelectDistrict(d.name)}
              >
                <div className={`h-1`} style={{ backgroundColor: rColor }} />
                <div className="p-2.5">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white mb-1.5"
                    style={{ backgroundColor: rColor }}
                  >
                    {region}
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 mb-0.5">{d.name}</h3>
                  <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{d.total}개 시설</span>
                  </div>
                  <button
                    className="w-full py-1 bg-gray-100/60 hover:bg-yellow-400 hover:text-gray-900 text-gray-500 rounded-lg text-[11px] font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDistrict(d.name);
                    }}
                  >
                    상세
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
