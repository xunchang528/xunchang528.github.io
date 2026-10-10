let cancelPendingWait = null;

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
  waitMs = 1200,
} = {}) {
  if (!synthesis || typeof synthesis.speak !== "function" || typeof Utterance !== "function") {
    onError("unsupported");
    return false;
  }

  cancelPendingWait?.();
  cancelPendingWait = null;

  try {
    try { synthesis.cancel?.(); } catch {}
    try { synthesis.resume?.(); } catch {}

    const speakWithVoice = (voices) => {
      const utterance = new Utterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.85;
      const voice = findJapaneseVoice(voices);
      if (voice) utterance.voice = voice;
      utterance.onerror = (event) => onError(event?.error || "unknown");
      synthesis.speak(utterance);
    };

    const voices = getVoices(synthesis);
    if (voices.length || typeof synthesis.addEventListener !== "function") {
      speakWithVoice(voices);
      return true;
    }

    let finished = false;
    let timerId;
    const cleanup = () => {
      synthesis.removeEventListener?.("voiceschanged", onVoicesChanged);
      clearTimeout(timerId);
      if (cancelPendingWait === cleanup) cancelPendingWait = null;
    };
    const finish = (availableVoices) => {
      if (finished) return;
      finished = true;
      cleanup();
      speakWithVoice(availableVoices);
    };
    const onVoicesChanged = () => {
      const availableVoices = getVoices(synthesis);
      if (availableVoices.length) finish(availableVoices);
    };
    cancelPendingWait = () => {
      if (finished) return;
      finished = true;
      cleanup();
    };

    synthesis.addEventListener("voiceschanged", onVoicesChanged);
    if (!finished) timerId = setTimeout(() => finish(getVoices(synthesis)), waitMs);
    return true;
  } catch {
    onError("unavailable");
    return false;
  }
}
