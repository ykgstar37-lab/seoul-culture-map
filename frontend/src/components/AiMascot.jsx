import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구",
  "광진구", "구로구", "금천구", "노원구", "도봉구",
  "동대문구", "동작구", "마포구", "서대문구", "서초구",
  "성동구", "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구",
];

export default function AiMascot() {
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function handleRecommend() {
    if (!district) return;
    setLoading(true);
    setResult("");
    try {
      const { data } = await axios.get("/api/recommend", {
        params: { district, lang: "ko" },
        timeout: 15000,
      });
      setResult(
        typeof data === "string"
          ? data
          : data.recommendation || data.result || JSON.stringify(data)
      );
    } catch {
      setResult(
        `${district}의 추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Speech bubble */}
      {open && (
        <div className="w-[350px] bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-5 mb-1 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">AI 관광 코스 추천</h3>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* District selector */}
          <select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setResult("");
            }}
            className="w-full px-3 py-2 mb-3 bg-white/40 border border-white/50 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">자치구 선택</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Recommend button */}
          <button
            onClick={handleRecommend}
            disabled={!district || loading}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all bg-yellow-400 text-gray-800 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                추천 생성 중...
              </span>
            ) : (
              "추천 받기"
            )}
          </button>

          {/* Result area */}
          {result && (
            <div className="mt-4 p-3 bg-white/30 rounded-xl text-sm text-gray-800 leading-relaxed max-h-60 overflow-y-auto prose prose-sm prose-gray">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          )}
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
