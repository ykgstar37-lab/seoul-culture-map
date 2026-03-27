export default function StatCards({ stats, districts }) {
  const total = stats?.total ?? 0;
  const districtCount = districts?.length ?? 25;
  const categoryCount = stats?.categoryCount ?? 6;

  let topName = "-";
  if (districts?.length > 0) {
    const sorted = [...districts].sort((a, b) => b.total - a.total);
    topName = sorted[0].name;
  }

  const cards = [
    { label: "총 시설", value: total.toLocaleString(), large: true },
    { label: "자치구", value: districtCount },
    { label: "카테고리", value: categoryCount },
    { label: "최다 지역", value: topName, small: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl p-3 shadow-sm"
        >
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            {card.label}
          </span>
          <p className={`font-bold text-gray-800 mt-1 ${card.small ? "text-lg" : "text-2xl"}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
