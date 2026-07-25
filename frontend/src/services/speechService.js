// Wraps the browser's built-in speech recognition (listening)
// and speech synthesis (speaking) — no external service needed.

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

export function isSpeechSupported() {
  return !!SpeechRecognition;
}

// Start listening to the mic. Calls onResult(text) once the user
// finishes speaking a sentence.
export function startListening(onResult, onError) {
  if (!SpeechRecognition) {
    onError?.("Speech recognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false; // stop after one sentence
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError?.(event.error);
  };

  recognition.start();
}

export function stopListening() {
  recognition?.stop();
}

// Speak text out loud. Calls onDone() when finished speaking.
export function speak(text, onDone) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
}