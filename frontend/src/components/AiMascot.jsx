import { useState } from "react";
import ChatPanel from "./ChatPanel";

export default function AiMascot({ onShowPlaces }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-[400px] h-[500px] bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-5 mb-1 animate-fade-in flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-800">AI 서울 문화 가이드</h3>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 min-h-0">
            <ChatPanel onShowPlaces={onShowPlaces} />
          </div>
        </div>
      )}

      {/* Mascot button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-[90px] h-[90px] transition-all hover:scale-110 drop-shadow-lg"
      >
        <img
          src="/mascot.png"
          alt="AI 마스코트"
          className="w-full h-full object-contain"
        />
      </button>
    </div>
  );
}
