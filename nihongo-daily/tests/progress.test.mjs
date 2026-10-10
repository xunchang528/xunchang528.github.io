import test from "node:test";
import assert from "node:assert/strict";
import * as progress from "../src/progress.mjs";

const getCurrentLesson = progress.getCurrentLesson ?? (() => undefined);
const isLessonUnlocked = progress.isLessonUnlocked ?? (() => false);
const completeLesson = progress.completeLesson ?? (() => fresh());
const loadProgress = progress.loadProgress ?? (() => fresh());
const saveProgress = progress.saveProgress ?? (() => false);
const normalizeProgress = progress.normalizeProgress ?? (() => fresh());
const hasPassedQuiz = progress.hasPassedQuiz ?? (() => false);
const STORAGE_KEY = progress.STORAGE_KEY ?? "missing-progress-key";

const fresh = () => ({ completedDays: [], lastStudiedDate: null });

test("a new learner starts at lesson 1 and only lesson 1 is open", () => {
  assert.equal(getCurrentLesson(fresh()), 1);
  assert.equal(isLessonUnlocked(1, fresh()), true);
  assert.equal(isLessonUnlocked(2, fresh()), false);
});

test("passing an open lesson unlocks only the next lesson", () => {
  const afterDayOne = completeLesson(fresh(), 1, 2, 3, "2026-10-11");
  assert.deepEqual(afterDayOne.completedDays, [1]);
  assert.equal(getCurrentLesson(afterDayOne), 2);
  assert.equal(isLessonUnlocked(2, afterDayOne), true);
  assert.equal(isLessonUnlocked(3, afterDayOne), false);
});

test("a score below two thirds does not complete a lesson", () => {
  const result = completeLesson(fresh(), 1, 1, 3, "2026-10-11");
  assert.deepEqual(result.completedDays, []);
  assert.equal(result.lastStudiedDate, null);
});

test("locked lessons cannot be completed out of order", () => {
  const result = completeLesson(fresh(), 3, 3, 3, "2026-10-11");
  assert.deepEqual(result.completedDays, []);
  assert.equal(getCurrentLesson(result), 1);
});

test("all completed lessons finish the plan", () => {
  const completed = { completedDays: Array.from({ length: 30 }, (_, i) => i + 1) };
  assert.equal(getCurrentLesson(completed), null);
  assert.equal(isLessonUnlocked(30, completed), true);
});

test("progress normalization removes invalid, duplicate, and out-of-sequence days", () => {
  assert.deepEqual(
    normalizeProgress({ completedDays: [1, 3, 3, 0, 31], lastStudiedDate: "bad" }),
    { completedDays: [1], lastStudiedDate: null },
  );
});

test("the quiz pass mark is two thirds and rejects empty quizzes", () => {
  assert.equal(hasPassedQuiz(2, 3), true);
  assert.equal(hasPassedQuiz(1, 3), false);
  assert.equal(hasPassedQuiz(0, 0), false);
});

test("progress survives a storage round trip and malformed data resets safely", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  const afterDayOne = completeLesson(fresh(), 1, 3, 3, "2026-10-11");
  assert.equal(saveProgress(storage, afterDayOne), true);
  assert.deepEqual(loadProgress(storage), afterDayOne);
  values.set(STORAGE_KEY, "not-json");
  assert.deepEqual(loadProgress(storage), fresh());
});
