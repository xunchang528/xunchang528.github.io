import test from "node:test";
import assert from "node:assert/strict";
import { speakJapanese } from "../src/speech.mjs";

class FakeSynthesis {
  voices = [];
  listeners = new Map();
  utterances = [];
  cancelCount = 0;
  resumeCount = 0;

  getVoices() { return this.voices; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  cancel() { this.cancelCount += 1; }
  resume() { this.resumeCount += 1; }
  speak(utterance) { this.utterances.push(utterance); }
  dispatch(type) { this.listeners.get(type)?.(); }
}

class FakeUtterance {
  constructor(text) { this.text = text; }
}

test("waits for browser voices and selects a Japanese voice", () => {
  const synthesis = new FakeSynthesis();
  const japaneseVoice = { lang: "ja-JP", name: "Japanese" };

  assert.equal(speakJapanese("こんにちは", {
    synthesis,
    Utterance: FakeUtterance,
    waitMs: 50,
  }), true);
  assert.equal(synthesis.utterances.length, 0);

  synthesis.voices = [japaneseVoice];
  synthesis.dispatch("voiceschanged");

  assert.equal(synthesis.utterances.length, 1);
  assert.equal(synthesis.utterances[0].text, "こんにちは");
  assert.equal(synthesis.utterances[0].lang, "ja-JP");
  assert.equal(synthesis.utterances[0].voice, japaneseVoice);
  assert.equal(synthesis.utterances[0].rate, 0.85);
  assert.equal(synthesis.cancelCount, 1);
  assert.equal(synthesis.resumeCount, 1);
});

test("uses the system voice if the browser does not load a voice list", async () => {
  const synthesis = new FakeSynthesis();
  speakJapanese("ありがとう", {
    synthesis,
    Utterance: FakeUtterance,
    waitMs: 1,
  });

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(synthesis.utterances.length, 1);
  assert.equal(synthesis.utterances[0].lang, "ja-JP");
  assert.equal(synthesis.utterances[0].voice, undefined);
});

test("reports unavailable speech support instead of failing silently", () => {
  const errors = [];
  const started = speakJapanese("おはよう", {
    synthesis: null,
    Utterance: null,
    onError: (error) => errors.push(error),
  });

  assert.equal(started, false);
  assert.deepEqual(errors, ["unsupported"]);
});

test("reports playback errors from the browser speech engine", () => {
  const synthesis = new FakeSynthesis();
  synthesis.voices = [{ lang: "en-US", name: "System voice" }];
  const errors = [];
  speakJapanese("さようなら", {
    synthesis,
    Utterance: FakeUtterance,
    onError: (error) => errors.push(error),
  });
  synthesis.utterances[0].onerror({ error: "voice-unavailable" });

  assert.deepEqual(errors, ["voice-unavailable"]);
});
