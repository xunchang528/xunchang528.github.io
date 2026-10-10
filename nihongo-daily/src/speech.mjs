function getVoices(synthesis) {
  try {
    return synthesis.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

function findJapaneseVoice(voices) {
  return voices.find((voice) => /^ja(?:[-_]|$)/i.test(voice.lang ?? ""));
}

export function speakJapanese(text, {
  synthesis,
  Utterance,
  onError = () => {},
} = {}) {
  if (!synthesis || typeof synthesis.speak !== "function" || typeof Utterance !== "function") {
    onError("unsupported");
    return false;
  }

  try {
    // Call speak in the same user gesture as the button tap. On mobile browsers,
    // waiting for voiceschanged can lose the activation required for playback.
    try { synthesis.cancel?.(); } catch {}
    try { synthesis.resume?.(); } catch {}

    const utterance = new Utterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    const voice = findJapaneseVoice(getVoices(synthesis));
    if (voice) utterance.voice = voice;
    utterance.onerror = (event) => onError(event?.error || "unknown");
    synthesis.speak(utterance);
    return true;
  } catch {
    onError("unavailable");
    return false;
  }
}
