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
    /* Also support district_labels format: { district_name: cluster_index } */
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
      <div className="relative z-10 pointer-events-none w-full h-full flex flex-col p-4 gap-4">
        {/* Top navbar */}
        <div className="pointer-events-auto">
          <Navbar
            onToggleFavorites={() => setShowFavorites((v) => !v)}
            favoritesCount={favorites.length}
          />
        </div>

        {/* Middle row: left sidebar + spacer + right panel */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left sidebar widget */}
          <aside className="pointer-events-auto w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            <StatCards stats={stats} districts={districts} />
            <div className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-4 space-y-5 shadow-xl">
              <CategoryFilter selected={selectedCategories} onToggle={toggleCategory} />
              <RangeSlider min={0} max={300} value={range} onChange={setRange} />
              <SubwayFilter selectedLine={selectedLine} onSelectLine={setSelectedLine} />
            </div>
          </aside>

          {/* Center spacer (map shows through) */}
          <div className="flex-1" />

          {/* Right panel widget */}
          <aside className="pointer-events-auto w-[280px] flex-shrink-0 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-xl">
            <DistrictList
              districts={filteredDistricts}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
            />
          </aside>
        </div>
      </div>

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
