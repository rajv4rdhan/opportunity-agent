/* Browser speech-to-text. The only browser-side file besides theme.css. */
window.ssVoice = (() => {
  let recognition = null;
  let listening = false;
  let finalText = "";
  let language = "en-IN";

  const supported = () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const emit = (name, payload) => {
    if (window.emitEvent) emitEvent(name, payload);
  };

  function start(lang) {
    if (!supported()) {
      emit("ss_voice_error", { error: "Voice input works in Chrome or Edge" });
      return false;
    }
    if (listening) stop();
    language = lang || "en-IN";
    finalText = "";
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText = `${finalText} ${text}`.trim();
        else interim += text;
      }
      emit("ss_voice", { final: finalText, interim });
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone permission denied",
        "no-speech": "Didn't catch that — try again",
        "audio-capture": "No microphone found",
      };
      listening = false;
      emit("ss_voice_error", { error: messages[event.error] || event.error });
    };
    recognition.onend = () => {
      listening = false;
      emit("ss_voice_end", {});
    };
    recognition.start();
    listening = true;
    return true;
  }

  function stop() {
    if (recognition && listening) recognition.stop();
    listening = false;
  }

  return { start, stop, supported };
})();
