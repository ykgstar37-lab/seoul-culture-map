import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 10000 });

export default function FavoritesPanel({ favorites, onToggleFavorite, onClose }) {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (favorites.length === 0) {
      setDetails([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      favorites.map(async (id) => {
        try {
          const { data } = await api.get(`/places/${id}`);
          return data;
        } catch {
          return { id, name: `시설 #${id}`, category: "알 수 없음", district: "" };
        }
      })
    ).then((results) => {
      if (!cancelled) {
        setDetails(results);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [favorites]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      {/* Panel */}
      <div className="relative pointer-events-auto w-[360px] h-full bg-white/30 backdrop-blur-xl border-l border-white/40 shadow-2xl p-6 overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">즐겨찾기</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500 text-center py-8">로딩 중...</p>
        )}

        {!loading && favorites.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-sm text-gray-400">저장된 시설이 없습니다</p>
          </div>
        )}

        {!loading && details.length > 0 && (
          <div className="space-y-3">
            {details.map((place) => {
              const placeId = place.id || place.place_id;
              return (
                <div
                  key={placeId}
                  className="bg-white/40 backdrop-blur-md border border-white/50 rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {place.name || place.facility_name || "시설"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {place.category || ""} {place.district ? `· ${place.district}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(placeId)}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
