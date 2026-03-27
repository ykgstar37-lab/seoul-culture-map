const tags = [
  { id: "culture", label: "문화탐방" },
  { id: "activity", label: "액티비티" },
  { id: "nature", label: "자연휴식" },
  { id: "history", label: "역사탐방" },
];

export default function TourismTags({ selected, onToggle }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">관광 목적</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isActive = selected.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-yellow-400 text-gray-900 shadow-md"
                  : "bg-white/60 text-gray-600 hover:bg-white/80 border border-white/40"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
