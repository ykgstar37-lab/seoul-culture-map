import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import StatCards from "../components/StatCards";
import CategoryFilter from "../components/CategoryFilter";
import RangeSlider from "../components/RangeSlider";
import TourismTags from "../components/TourismTags";
import SeoulMap from "../components/SeoulMap";
import DistrictList from "../components/DistrictList";
import DistrictPopup from "../components/DistrictPopup";
import AiMascot from "../components/AiMascot";
import SubwayFilter from "../components/SubwayFilter";
import FavoritesPanel from "../components/FavoritesPanel";
import useFavorites from "../hooks/useFavorites";
import { fetchStats, fetchDistricts, fetchSubwayStations, fetchClusters } from "../api/client";

const CATEGORY_MAP = {
  tourism: "관광지",
  culture: "문화시설",
  performance: "공연시설",
  museum: "박물관",
  heritage: "유적지",
  park: "공원",
  sports: "레포츠",
};

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, cinema: 0, performance: 0, museum: 0 });
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [range, setRange] = useState([0, 300]);
  const [tourismTags, setTourismTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [subwayStations, setSubwayStations] = useState([]);
  const [clusterData, setClusterData] = useState({ clusters: [], district_labels: {} });
  const [showCluster, setShowCluster] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null); // "filter" | "districts" | null

  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    (async () => {
      const [s, d, subway, clusters] = await Promise.all([
        fetchStats(),
        fetchDistricts(),
        fetchSubwayStations(),
        fetchClusters(),
      ]);
      setStats(s);
      setDistricts(d);
      setSubwayStations(subway);
      setClusterData(clusters);
      setLoading(false);
    })();
  }, []);

  function toggleCategory(id) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleTag(id) {
    setTourismTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  const CLUSTER_COLORS = ["#facc15", "#3b82f6", "#9ca3af", "#f97316"];

  const clusterColors = useMemo(() => {
    const map = {};
    (clusterData.clusters || []).forEach((cluster, i) => {
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
      (cluster.districts || []).forEach((district) => {
        map[district] = color;
      });
    });
    if (Object.keys(map).length === 0 && clusterData.district_labels) {
      Object.entries(clusterData.district_labels).forEach(([district, clusterIdx]) => {
        map[district] = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
      });
    }
    return map;
  }, [clusterData]);

  const filteredDistricts = useMemo(() => {
    let result = districts;
    if (searchQuery.trim()) {
      result = result.filter((d) => d.name.includes(searchQuery.trim()));
    }
    result = result.filter((d) => d.total >= range[0] && d.total <= range[1]);
    if (selectedCategories.length > 0) {
      result = result.filter((d) => {
        const cats = d.categories || {};
        return selectedCategories.some((catId) => {
          const label = CATEGORY_MAP[catId];
          return label && (cats[label] || 0) > 0;
        });
      });
    }
    return result;
  }, [districts, searchQuery, range, selectedCategories]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen map background */}
      <div className="absolute inset-0 z-0">
        {!loading && (
          <SeoulMap
            districts={filteredDistricts}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategories={selectedCategories}
            subwayStations={subwayStations}
            clusterColors={clusterColors}
            showCluster={showCluster}
            onToggleCluster={() => setShowCluster((v) => !v)}
            selectedLine={selectedLine}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        )}
      </div>

      {/* District detail popup */}
      {selectedDistrict && (
        <DistrictPopup
          district={filteredDistricts.find(d => d.name === selectedDistrict)}
          onClose={() => setSelectedDistrict(null)}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />
      )}

      {/* Floating UI overlays */}
      <div className="relative z-10 pointer-events-none w-full h-full flex flex-col p-2 md:p-4 gap-2 md:gap-4">
        {/* Top navbar */}
        <div className="pointer-events-auto">
          <Navbar
            onToggleFavorites={() => setShowFavorites((v) => !v)}
            favoritesCount={favorites.length}
          />
        </div>

        {/* Middle row: left sidebar + spacer + right panel (desktop) */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left sidebar — desktop only */}
          <aside className="pointer-events-auto w-[280px] flex-shrink-0 hidden md:flex flex-col gap-3 overflow-y-auto">
            <StatCards stats={stats} districts={districts} />
            <div className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-4 space-y-5 shadow-xl">
              <CategoryFilter selected={selectedCategories} onToggle={toggleCategory} />
              <RangeSlider min={0} max={300} value={range} onChange={setRange} />
              <SubwayFilter selectedLine={selectedLine} onSelectLine={setSelectedLine} />
            </div>
          </aside>

          {/* Center spacer (map shows through) */}
          <div className="flex-1" />

          {/* Right panel — desktop only */}
          <aside className="pointer-events-auto w-[280px] flex-shrink-0 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-xl hidden md:block">
            <DistrictList
              districts={filteredDistricts}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
            />
          </aside>
        </div>
      </div>

      {/* Mobile bottom controls */}
      <div className="md:hidden fixed bottom-4 left-2 right-2 z-20 flex gap-2 pointer-events-auto">
        <button
          onClick={() => setMobilePanel(mobilePanel === "filter" ? null : "filter")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
            mobilePanel === "filter" ? "bg-yellow-400 text-gray-900" : "bg-white/80 backdrop-blur-xl text-gray-700"
          }`}
        >
          필터
        </button>
        <button
          onClick={() => setMobilePanel(mobilePanel === "districts" ? null : "districts")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
            mobilePanel === "districts" ? "bg-yellow-400 text-gray-900" : "bg-white/80 backdrop-blur-xl text-gray-700"
          }`}
        >
          자치구
        </button>
      </div>

      {/* Mobile slide-up panel */}
      {mobilePanel && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-xl border-t border-white/40 rounded-t-2xl shadow-xl max-h-[60vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-800">
                {mobilePanel === "filter" ? "필터" : "자치구 목록"}
              </h3>
              <button
                onClick={() => setMobilePanel(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {mobilePanel === "filter" ? (
              <div className="space-y-4">
                <StatCards stats={stats} districts={districts} />
                <CategoryFilter selected={selectedCategories} onToggle={toggleCategory} />
                <RangeSlider min={0} max={300} value={range} onChange={setRange} />
                <SubwayFilter selectedLine={selectedLine} onSelectLine={setSelectedLine} />
              </div>
            ) : (
              <DistrictList
                districts={filteredDistricts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={(name) => { setSelectedDistrict(name); setMobilePanel(null); }}
              />
            )}
          </div>
        </div>
      )}

      {/* AI Mascot */}
      <AiMascot />

      {/* Favorites Panel */}
      {showFavorites && (
        <FavoritesPanel
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setShowFavorites(false)}
        />
      )}
    </div>
  );
}
