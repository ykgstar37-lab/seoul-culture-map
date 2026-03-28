import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const LINES = [
  { id: "1호선", color: "#0052A4" },
  { id: "2호선", color: "#009B3E" },
  { id: "3호선", color: "#EF7C1C" },
  { id: "4호선", color: "#00A5DE" },
  { id: "5호선", color: "#996CAC" },
  { id: "6호선", color: "#CD7C2F" },
  { id: "7호선", color: "#747F00" },
  { id: "8호선", color: "#E6186C" },
  { id: "9호선", color: "#BDB092" },
  { id: "신분당선", color: "#D4003B" },
  { id: "경의중앙선", color: "#77C4A3" },
  { id: "분당선", color: "#F5A200" },
  { id: "경춘선", color: "#178C72" },
  { id: "공항철도1호선", color: "#0090D2" },
  { id: "우이신설선", color: "#B7C452" },
  { id: "신림선", color: "#6789CA" },
  { id: "김포골드라인", color: "#A17E46" },
  { id: "서해선", color: "#8CC63F" },
  { id: "의정부선", color: "#FDA600" },
];

export default function SubwayFilter({ selectedLine, onSelectLine }) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0 });
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const selected = LINES.find((l) => l.id === selectedLine);

  function handleToggle() {
    if (!open && ref.current) {
      const sidebar = ref.current.closest("aside");
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : ref.current.getBoundingClientRect();
      const btnRect = ref.current.getBoundingClientRect();
      setDropdownPos({
        left: sidebarRect.right + 8,
        top: Math.min(btnRect.top, window.innerHeight - 340),
      });
    }
    setOpen(!open);
  }

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-48 bg-white/80 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl max-h-[320px] overflow-y-auto z-[9999] py-1"
          style={{ left: dropdownPos.left, top: dropdownPos.top }}
        >
          <button
            onClick={() => { onSelectLine(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/60 ${
              !selectedLine ? "font-semibold text-gray-800" : "text-gray-500"
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
            전체 노선
          </button>
          {LINES.map((line) => {
            const isActive = selectedLine === line.id;
            return (
              <button
                key={line.id}
                onClick={() => { onSelectLine(isActive ? null : line.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/60 ${
                  isActive ? "font-semibold" : ""
                }`}
                style={isActive ? { color: line.color } : { color: "#374151" }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: line.color }}
                />
                <span style={{ color: line.color }}>{line.id}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">지하철 노선</h3>
      <div className="relative" ref={ref}>
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white/40 backdrop-blur-sm border border-white/40 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-white/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            {selected && (
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
            )}
            <span className={selected ? "font-medium" : "text-gray-400"}>
              {selected ? selected.id : "전체 노선"}
            </span>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdown}

        {selected && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            <span className="text-xs font-semibold" style={{ color: selected.color }}>{selected.id}</span>
            <button
              onClick={() => onSelectLine(null)}
              className="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
            >
              해제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
