const CATEGORY_ICONS = {
  "영화관": "🎬",
  "공연시설": "🎭",
  "박물관/유적지": "🏛️",
  "방탈출": "🔐",
  "공원": "🌳",
  "전통사찰": "⛩️",
};

const RECOMMEND = {
  "강남구": "문화·엔터 밀집 — 영화관 + 방탈출 코스 추천",
  "종로구": "전통·공연 명소 — 사찰 + 공연시설 탐방",
  "마포구": "액티비티 천국 — 방탈출 + 공원 산책 코스",
  "송파구": "자연·문화 — 공원 + 박물관 코스",
  "서초구": "예술·공연 — 공연시설 + 박물관 탐방",
};

export default function DistrictPopup({ district, onClose, onToggleFavorite, isFavorite }) {
  if (!district) return null;

  const categories = district.categories || {};
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-end pr-[296px] pointer-events-none">
      <div
        className="pointer-events-auto bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl shadow-xl p-6 w-[340px] max-h-[480px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{district.name}</h2>
            <p className="text-sm text-gray-500">총 {district.total}개 문화시설</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category bar chart */}
        <div className="space-y-2.5 mb-5">
          {sorted.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{CATEGORY_ICONS[cat] || "📍"}</span>
                <span className="text-xs font-medium text-gray-600 w-20 truncate">{cat}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-800 w-8 text-right">{count}</span>
              </div>
            ))}
        </div>

        {/* Top category highlight */}
        {sorted.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-yellow-800">
              <span className="font-bold">#{district.name} 최다 시설</span> — {sorted[0][0]} ({sorted[0][1]}개)
            </p>
          </div>
        )}

        {/* Recommendation */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[11px] text-gray-400 mb-1 font-medium">추천 관광 코스</p>
          <p className="text-sm text-gray-700 font-medium">
            {RECOMMEND[district.name] || `${district.name} — ${sorted[0]?.[0] || "문화시설"} 중심 탐방 추천`}
          </p>
        </div>
      </div>
    </div>
  );
}
