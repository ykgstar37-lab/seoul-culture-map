const categories = [
  { id: "tourism", label: "관광지", icon: CameraIcon },
  { id: "culture", label: "문화시설", icon: BuildingIcon },
  { id: "performance", label: "공연시설", icon: MusicIcon },
  { id: "museum", label: "박물관", icon: MuseumIcon },
  { id: "heritage", label: "유적지", icon: HeritageIcon },
  { id: "park", label: "공원", icon: TreeIcon },
  { id: "sports", label: "레포츠", icon: SportIcon },
];

export default function CategoryFilter({ selected, onToggle }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">시설 유형</h3>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => {
          const isActive = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "bg-white/60 text-gray-600 hover:bg-white/80 border border-white/40"
              }`}
            >
              <cat.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CameraIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
}
function BuildingIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>);
}
function MusicIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>);
}
function MuseumIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>);
}
function TreeIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14M12 4l-5 8h3l-2 4h8l-2-4h3L12 4z" /></svg>);
}
function HeritageIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 12h3v8h14v-8h3L12 3zM9 21v-6h6v6" /></svg>);
}
function SportIcon({ className }) {
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
}
