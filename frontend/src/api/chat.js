import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

/**
 * Send a message to the AI agent.
 * @param {string} message - User message
 * @param {string|null} sessionId - Session ID (null for new session)
 * @returns {Promise<{text: string, places: Array, session_id: string, intent: string}>}
 */
export async function sendMessage(message, sessionId = null) {
  const { data } = await api.post("/chat", {
    message,
    session_id: sessionId,
  });
  return data;
}

/**
 * Fetch recent chat sessions.
 * @returns {Promise<Array<{id: string, title: string, created_at: string, message_count: number}>>}
 */
export async function fetchSessions() {
  const { data } = await api.get("/chat/sessions");
  return data;
}

/**
 * Fetch chat history for a session.
 * @param {string} sessionId
 * @returns {Promise<Array<{role: string, content: string, places: Array}>>}
 */
export async function fetchChatHistory(sessionId) {
  const { data } = await api.get(`/chat/history/${sessionId}`);
  return data;
}

/**
 * Delete a chat session.
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  await api.delete(`/chat/sessions/${sessionId}`);
}

/**
 * Stream a chat response via SSE.
 * @param {string} message
 * @param {string|null} sessionId
 * @param {object} callbacks - { onToken, onPlaces, onIntent, onDone, onError }
 */
export async function streamMessage(message, sessionId, callbacks = {}) {
  const { onToken, onPlaces, onIntent, onDone, onError } = callbacks;

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (currentEvent === "token") onToken?.(data.text);
            else if (currentEvent === "places") onPlaces?.(data.places);
            else if (currentEvent === "intent") onIntent?.(data);
            else if (currentEvent === "done") onDone?.(data);
            else if (currentEvent === "error") onError?.(data.text);
          } catch {
            /* skip malformed JSON */
          }
        }
      }
    }
  } catch (err) {
    onError?.(err.message || "스트리밍 연결 실패");
  }
}
