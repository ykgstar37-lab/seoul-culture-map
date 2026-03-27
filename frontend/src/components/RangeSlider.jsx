export default function RangeSlider({ min = 0, max = 300, value, onChange }) {
  const lo = value?.[0] ?? min;
  const hi = value?.[1] ?? max;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">시설 수 범위</h3>
      <div className="bg-white/40 rounded-xl p-4 border border-white/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">최소</span>
          <span className="text-xs text-gray-400">최대</span>
        </div>
        <div className="space-y-3">
          <input
            type="range"
            min={min}
            max={max}
            value={lo}
            onChange={(e) => onChange([Number(e.target.value), hi])}
            className="w-full bg-gray-200 accent-yellow-400"
          />
          <input
            type="range"
            min={min}
            max={max}
            value={hi}
            onChange={(e) => onChange([lo, Number(e.target.value)])}
            className="w-full bg-gray-200 accent-yellow-400"
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-gray-800">{lo}</span>
          <span className="text-xs text-gray-400">~</span>
          <span className="text-sm font-bold text-gray-800">{hi}</span>
        </div>
      </div>
    </div>
  );
}
