const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL =  "gemini-3.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT =
  "You are a professional job interviewer. Ask one clear question at a time, " +
  "listen to the candidate's answer, then ask a relevant follow-up question. " +
  "Keep responses short and conversational, like a real spoken interview.";

// conversation: array of { role: "user" | "assistant", content: string }
export async function getInterviewerReply(conversation) {
  const contents = conversation.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(`${URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API error:", data);
    throw new Error(data.error?.message || "Gemini request failed");
  }

  return data.candidates[0].content.parts[0].text;
}