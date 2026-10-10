export const STORAGE_KEY = "nihongo-daily-progress-v1";
export const LESSON_COUNT = 30;

export function createInitialProgress() {
  return { completedDays: [], lastStudiedDate: null };
}

export function normalizeProgress(value) {
  const rawDays = Array.isArray(value?.completedDays) ? value.completedDays : [];
  const validDays = new Set(rawDays.filter(
    (day) => Number.isInteger(day) && day >= 1 && day <= LESSON_COUNT,
  ));
  const completedDays = [];
  for (let day = 1; day <= LESSON_COUNT && validDays.has(day); day += 1) completedDays.push(day);
  const lastStudiedDate = typeof value?.lastStudiedDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value.lastStudiedDate)
    ? value.lastStudiedDate
    : null;
  return { completedDays, lastStudiedDate };
}

export function getCurrentLesson(progress) {
  const completed = new Set(normalizeProgress(progress).completedDays);
  for (let day = 1; day <= LESSON_COUNT; day += 1) {
    if (!completed.has(day)) return day;
  }
  return null;
}

export function isLessonUnlocked(day, progress) {
  if (!Number.isInteger(day) || day < 1 || day > LESSON_COUNT) return false;
  const current = getCurrentLesson(progress);
  return current === null || day <= current;
}

export function hasPassedQuiz(score, total) {
  return Number.isFinite(score) && Number.isFinite(total)
    && total > 0 && score >= Math.ceil((total * 2) / 3);
}

export function completeLesson(progress, day, score, total, date = null) {
  const current = normalizeProgress(progress);
  if (!isLessonUnlocked(day, current) || !hasPassedQuiz(score, total)) return current;
  if (current.completedDays.includes(day)) return current;
  return normalizeProgress({
    completedDays: [...current.completedDays, day],
    lastStudiedDate: date ?? current.lastStudiedDate,
  });
}

export function loadProgress(storage) {
  try {
    const source = storage ?? globalThis.localStorage;
    const raw = source?.getItem(STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : createInitialProgress();
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(storage, progress) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target?.setItem) return false;
    target.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
    return true;
  } catch {
    return false;
  }
}
