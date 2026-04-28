import { useState, useRef } from "react";

export function useVoice(lang, log) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "Hindi" ? "hi-IN" : lang === "Spanish" ? "es-ES" : "en-US";
    synth.cancel();
    synth.speak(utterance);
  };

  const toggleVoiceInput = (onTranscript) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      log("[VOICE] Speech recognition is not available in this browser", "warning");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = lang === "Hindi" ? "hi-IN" : lang === "Spanish" ? "es-ES" : "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => {
      setListening(true);
      log("[VOICE] Listening...", "process");
    };
    recog.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        onTranscript(transcript);
        log("[VOICE] Speech captured and inserted into input", "success");
      }
    };
    recog.onerror = (event) => {
      log(`[VOICE] Recognition error: ${event.error}`, "error");
      setListening(false);
    };
    recog.onend = () => setListening(false);
    recognitionRef.current = recog;
    recog.start();
  };

  return { listening, speak, toggleVoiceInput };
}
