import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { streamMessage, fetchSessions, fetchChatHistory } from "../api/chat";

export default function ChatPanel({ onShowPlaces }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, places: [] }]);
    setInput("");
    setLoading(true);

    // Add an empty assistant message that will be filled by streaming tokens
    const assistantIdx = messages.length + 1; // +1 for the user message we just added
    setMessages((prev) => [...prev, { role: "assistant", content: "", places: [] }]);

    try {
      await streamMessage(text, sessionId, {
        onToken: (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + token };
            }
            return updated;
          });
        },
        onPlaces: (places) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, places: places || [] };
            }
            return updated;
          });
        },
        onIntent: (data) => {
          if (data.session_id) setSessionId(data.session_id);
        },
        onDone: (data) => {
          if (data.session_id) setSessionId(data.session_id);
          setLoading(false);
        },
        onError: (errMsg) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: errMsg || "죄송합니다, 응답을 생성하지 못했습니다.",
              };
            }
            return updated;
          });
          setLoading(false);
        },
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "죄송합니다, 응답을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          };
        }
        return updated;
      });
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleShowHistory() {
    try {
      const data = await fetchSessions();
      setSessions(data);
      setShowHistory(true);
    } catch {
      /* ignore */
    }
  }

  async function handleLoadSession(sid) {
    try {
      const history = await fetchChatHistory(sid);
      setSessionId(sid);
      setMessages(
        history.map((m) => ({
          role: m.role,
          content: m.content,
          places: m.places || [],
        }))
      );
      setShowHistory(false);
    } catch {
      /* ignore */
    }
  }

  function handleNewChat() {
    setSessionId(null);
    setMessages([]);
    setShowHistory(false);
  }

  // History list view
  if (showHistory) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-700">대화 기록</span>
          <div className="flex gap-1">
            <button
              onClick={handleNewChat}
              className="text-xs px-2 py-1 bg-yellow-400/80 hover:bg-yellow-300 rounded-lg transition-colors text-gray-800"
            >
              새 대화
            </button>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs px-2 py-1 bg-white/40 hover:bg-white/60 rounded-lg transition-colors text-gray-600"
            >
              돌아가기
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {sessions.length === 0 && (
            <p className="text-center text-gray-500 text-xs mt-6">
              저장된 대화가 없습니다.
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleLoadSession(s.id)}
              className="w-full text-left px-3 py-2 bg-white/30 hover:bg-white/50 rounded-xl transition-colors"
            >
              <p className="text-sm text-gray-800 truncate">{s.title || "대화"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.message_count}개 메시지
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <button
          onClick={handleShowHistory}
          className="text-xs px-2 py-1 bg-white/40 hover:bg-white/60 rounded-lg transition-colors text-gray-600"
          title="대화 기록"
        >
          <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          기록
        </button>
        <button
          onClick={handleNewChat}
          className="text-xs px-2 py-1 bg-white/40 hover:bg-white/60 rounded-lg transition-colors text-gray-600"
        >
          새 대화
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-6 space-y-2">
            <p className="text-base">서울 문화 여행 가이드</p>
            <p>궁금한 것을 물어보세요!</p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {["종로구 추천해줘", "박물관 어디있어?", "서울 공원 추천"].map(
                (hint) => (
                  <button
                    key={hint}
                    onClick={() => setInput(hint)}
                    className="px-2.5 py-1 text-xs bg-white/40 hover:bg-white/60 rounded-lg border border-white/50 transition-colors text-gray-700"
                  >
                    {hint}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-yellow-400/80 text-gray-800 rounded-br-md"
                  : "bg-white/40 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-gray max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}

              {msg.places?.length > 0 && (
                <button
                  onClick={() => onShowPlaces?.(msg.places)}
                  className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  지도에 표시 ({msg.places.length}곳)
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/40 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-2 border-t border-white/30">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          className="flex-1 px-3 py-2 bg-white/40 border border-white/50 rounded-xl text-sm text-gray-800 outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
        >
          <svg className="w-4 h-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
