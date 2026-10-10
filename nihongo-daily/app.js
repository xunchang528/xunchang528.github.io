import { COURSE } from "./src/course.mjs";
import { speakJapanese } from "./src/speech.mjs";
import {
  completeLesson,
  getCurrentLesson,
  hasPassedQuiz,
  isLessonUnlocked,
  loadProgress,
  saveProgress,
} from "./src/progress.mjs";

const main = document.querySelector("#mainContent");
const nav = document.querySelector(".bottom-nav");
const toast = document.querySelector("#toast");
const installButton = document.querySelector("#installButton");
const weekNames = ["假名打底", "片假名入门", "开口说日常", "会用基础句型", "复习与表达"];
const letterLabels = ["A", "B", "C", "D"];

let progress = loadProgress();
let installPrompt = null;
let toastTimer;
let view = {
  screen: "today",
  lessonDay: null,
  quizIndex: 0,
  selectedChoice: null,
  answers: [],
  openReviewIds: new Set(),
};

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function prettyDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function setActiveTab(route) {
  for (const button of nav.querySelectorAll("[data-route]")) {
    const active = button.dataset.route === route;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}

function render() {
  const route = ["today", "roadmap", "review"].includes(view.screen) ? view.screen : "today";
  setActiveTab(route);
  if (view.screen === "today") main.innerHTML = renderToday();
  else if (view.screen === "roadmap") main.innerHTML = renderRoadmap();
  else if (view.screen === "review") main.innerHTML = renderReview();
  else if (view.screen === "lesson") main.innerHTML = renderLesson();
  else if (view.screen === "quiz") main.innerHTML = renderQuiz();
  else if (view.screen === "result") main.innerHTML = renderResult();
}

function renderToday() {
  const current = getCurrentLesson(progress);
  const completed = progress.completedDays.length;
  const percent = Math.round((completed / COURSE.length) * 100);
  const currentLesson = current ? COURSE[current - 1] : null;
  const title = currentLesson?.title ?? "30 天入门计划已完成";
  const description = currentLesson
    ? currentLesson.focus
    : "你已经走完假名、日常表达和基础句型的第一段路。可以回到课程表复习，也可以重新读今天的卡片。";
  const action = currentLesson
    ? `<button class="primary-button" type="button" data-action="open-current">${completed ? "继续" : "开始"}第 ${String(current).padStart(2, "0")} 课 <span aria-hidden="true">→</span></button>`
    : `<button class="primary-button" type="button" data-route="review">去复习已学内容 <span aria-hidden="true">→</span></button>`;
  const currentWeek = currentLesson?.week ?? 5;

  return `
    <div class="page-heading">
      <div><div class="eyebrow">今日学习</div><h1>每天 10 分钟，慢慢学会日语。</h1><p>按自己的节奏来，先把今天这一小步走稳。</p></div>
      <div class="date-label">${prettyDate()}</div>
    </div>
    <div class="home-grid">
      <section class="today-card" aria-labelledby="today-title">
        <div class="today-card-inner">
          <div class="today-label"><span aria-hidden="true">✦</span> ${currentLesson ? `第 ${String(current).padStart(2, "0")} 课 · 第 ${currentWeek} 阶段` : "学习计划完成"}</div>
          <h2 id="today-title">${title}</h2>
          <p>${description}</p>
          ${currentLesson ? `<div class="today-meta"><span><span aria-hidden="true">◷</span> 约 10 分钟</span><span><span aria-hidden="true">✎</span> 3 道小测</span></div>` : ""}
          ${action}
        </div>
      </section>
      <section class="progress-card" aria-label="学习进度">
        <div class="progress-card-head"><div><h3>30 天入门进度</h3><p class="small-copy">每天一课，按顺序稳步学</p></div><strong class="progress-number">${percent}%</strong></div>
        <div class="progress-track" role="progressbar" aria-label="课程完成度" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${completed}"><div class="progress-fill" style="width:${percent}%"></div></div>
        <div class="progress-foot"><span>已学 ${completed} / 30 课</span><span>${currentLesson ? `下一课 ${String(current).padStart(2, "0")}` : "全部完成"}</span></div>
        <div class="mini-stats"><div class="mini-stat"><strong>${currentLesson ? String(current).padStart(2, "0") : "30"}</strong><span>当前课程</span></div><div class="mini-stat"><strong>${currentLesson ? `第 ${currentWeek} 周` : "完成"}</strong><span>学习阶段</span></div></div>
      </section>
    </div>
    <div class="section-row"><div><h2>30 天学习路线</h2><p>从假名开始，最后完成一段自我介绍。</p></div><button class="text-button" type="button" data-route="roadmap">查看全部 →</button></div>
    <div class="week-grid">${weekNames.map((name, index) => renderWeekCard(index + 1, name, current)).join("")}</div>
    <div class="install-hint"><span aria-hidden="true">⌂</span><span>想每天打开更方便？在手机浏览器菜单中选择“添加到主屏幕”，就能像应用一样启动。</span></div>
  `;
}

function renderWeekCard(week, name, current) {
  const start = (week - 1) * 7 + 1;
  const end = Math.min(week * 7, COURSE.length);
  const done = progress.completedDays.filter((day) => day >= start && day <= end).length;
  const currentCard = current !== null && current >= start && current <= end;
  return `<button class="week-card${currentCard ? " is-current" : ""}" type="button" data-week="${week}" aria-label="查看第 ${week} 周，${name}">
    <span class="week-index"><span>第 ${week} 周</span><b>${done}/${end - start + 1}</b></span>
    <strong>${name}</strong><small>第 ${start}–${end} 课</small>
  </button>`;
}

function renderRoadmap() {
  const current = getCurrentLesson(progress);
  const sections = weekNames.map((name, index) => {
    const week = index + 1;
    const lessons = COURSE.filter((item) => item.week === week);
    const completeCount = lessons.filter((item) => progress.completedDays.includes(item.day)).length;
    return `<section class="week-section" id="week-${week}">
      <div class="week-section-head"><h2>第 ${week} 周 · ${name}</h2><span>${completeCount} / ${lessons.length} 课完成</span></div>
      <div class="roadmap-items">${lessons.map((item) => {
        const complete = progress.completedDays.includes(item.day);
        const unlocked = isLessonUnlocked(item.day, progress);
        const isCurrent = item.day === current;
        const status = complete ? "✓" : unlocked ? "›" : "⌑";
        return `<button class="roadmap-item${complete ? " is-done" : ""}${isCurrent ? " is-current" : ""}" type="button" data-day="${item.day}" ${unlocked ? "" : "disabled"} aria-label="第 ${item.day} 课，${item.title}${complete ? "，已完成" : unlocked ? "，可学习" : "，尚未解锁"}">
          <span class="roadmap-number">${complete ? "✓" : String(item.day).padStart(2, "0")}</span><span class="roadmap-copy"><strong>${item.title}</strong><small>${item.focus}</small></span><span class="roadmap-status" aria-hidden="true">${status}</span>
        </button>`;
      }).join("")}</div>
    </section>`;
  }).join("");

  return `<div class="page-heading"><div><div class="eyebrow">循序渐进</div><h1>你的 30 天学习路线</h1><p>先完成当前课程，就会解锁下一课。已经学过的内容随时可以回来复习。</p></div><div class="date-label">已完成 ${progress.completedDays.length} / 30 课</div></div><div class="roadmap-list">${sections}</div>`;
}

function renderLesson() {
  const item = COURSE[(view.lessonDay ?? 1) - 1];
  if (!item || !isLessonUnlocked(item.day, progress)) {
    view.screen = "roadmap";
    return renderRoadmap();
  }
  const completed = progress.completedDays.includes(item.day);
  return `
    <div class="lesson-toolbar"><button class="back-button" type="button" data-action="back" aria-label="返回">←</button><span class="lesson-progress-label">${completed ? "复习课程" : `第 ${String(item.day).padStart(2, "0")} 课`} · 第 ${item.week} 周</span></div>
    <section class="lesson-head"><div class="eyebrow">${completed ? "再看一遍" : "今天学一点"}</div><h1>${item.title}</h1><p>${item.focus}</p><div class="lesson-tags"><span class="tag">约 ${item.minutes} 分钟</span><span class="tag">${item.steps.length} 组内容</span><span class="tag">小测 3 题</span></div></section>
    <div class="section-row"><div><h2>看一看，跟着读</h2><p>先读日语，再看罗马音和中文意思。</p></div></div>
    <div class="learn-list">${item.steps.map((step, index) => `<article class="learn-card">
      <div class="learn-card-top"><span class="learn-kicker">学习卡 ${String(index + 1).padStart(2, "0")}</span><button class="speak-button" type="button" data-action="speak" data-text="${step.japanese}" aria-label="朗读${step.japanese}">▶ 朗读</button></div>
      <div class="learn-japanese" lang="ja">${step.japanese}</div><div class="learn-romaji">${step.romaji}</div><p class="learn-meaning">${step.meaning}</p>
      ${step.example ? `<div class="example-line"><strong lang="ja">${step.example}</strong><span class="example-romaji">${step.exampleRomaji}</span><span>${step.exampleMeaning}</span><button class="speak-button" type="button" data-action="speak" data-text="${step.example}" aria-label="朗读${step.example}">▶</button></div>` : ""}
    </article>`).join("")}</div>
    <div class="lesson-actions"><button class="primary-button" type="button" data-action="start-quiz">${completed ? "再做一次小测" : "我学好了，开始小测"} <span aria-hidden="true">→</span></button></div>
  `;
}

function renderQuiz() {
  const item = COURSE[(view.lessonDay ?? 1) - 1];
  if (!item || !isLessonUnlocked(item.day, progress)) {
    view.screen = "roadmap";
    return renderRoadmap();
  }
  const question = item.quiz[view.quizIndex];
  const selected = view.selectedChoice;
  const answered = selected !== null;
  const correct = selected === question.answer;
  const width = Math.round(((view.quizIndex + 1) / item.quiz.length) * 100);
  return `<div class="lesson-toolbar"><button class="back-button" type="button" data-action="back-to-lesson" aria-label="返回课程">←</button><span class="lesson-progress-label">第 ${String(item.day).padStart(2, "0")} 课 · 小测</span></div>
    <section class="quiz-card" aria-labelledby="quiz-question">
      <div class="quiz-progress"><span>第 <strong>${view.quizIndex + 1}</strong> / ${item.quiz.length} 题</span><span>答对两题即可完成</span></div>
      <div class="quiz-track" aria-hidden="true"><span style="width:${width}%"></span></div>
      <h1 id="quiz-question">${question.prompt}</h1>
      <div class="answer-list">${question.choices.map((choice, index) => `<button class="answer-option${selected === index ? " is-selected" : ""}" type="button" data-choice="${index}" ${answered ? "disabled" : ""} aria-pressed="${selected === index}"><span class="answer-letter">${letterLabels[index] ?? index + 1}</span><span>${choice}</span></button>`).join("")}</div>
      <p class="quiz-feedback${answered ? " is-visible" : ""}" aria-live="polite">${answered ? `${correct ? "答对了！" : "再记一下："}${question.note}` : "选择一个答案，看看自己记住了多少。"}</p>
      <div class="quiz-actions"><button class="quiet-button" type="button" data-action="back-to-lesson">回去看卡片</button><button class="primary-button" type="button" data-action="next-question" ${answered ? "" : "disabled"}>${view.quizIndex === item.quiz.length - 1 ? "查看结果" : "下一题"} <span aria-hidden="true">→</span></button></div>
    </section>`;
}

function renderResult() {
  const item = COURSE[(view.lessonDay ?? 1) - 1];
  if (!item) return renderToday();
  const score = view.answers.reduce((sum, answer, index) => sum + Number(answer === item.quiz[index].answer), 0);
  const passed = hasPassedQuiz(score, item.quiz.length);
  const alreadyComplete = progress.completedDays.includes(item.day);
  if (passed && !alreadyComplete) {
    progress = completeLesson(progress, item.day, score, item.quiz.length, todayInShanghai());
    if (!saveProgress(undefined, progress)) showToast("学习完成，但这台浏览器暂时不能保存进度。");
  }
  const next = item.day < COURSE.length ? item.day + 1 : null;
  const nextButton = passed
    ? next
      ? `<button class="primary-button" type="button" data-action="next-lesson">开始第 ${String(next).padStart(2, "0")} 课 <span aria-hidden="true">→</span></button>`
      : `<button class="primary-button" type="button" data-route="review">去复习已学内容 <span aria-hidden="true">→</span></button>`
    : `<button class="primary-button" type="button" data-action="retry">再试一次 <span aria-hidden="true">↻</span></button>`;
  const review = item.quiz.map((question, index) => {
    const answer = view.answers[index];
    const right = answer === question.answer;
    return `<div class="answer-review-item"><strong>${right ? "✓" : "↺"} ${question.prompt}</strong><span>你的答案：${question.choices[answer] ?? "未作答"}${right ? "" : ` · 正确答案：${question.choices[question.answer]}`} · ${question.note}</span></div>`;
  }).join("");
  return `<section class="result-card"><div class="result-stamp${passed ? "" : " is-retry"}" aria-hidden="true">${passed ? "✓" : "↻"}</div><h1>${passed ? (alreadyComplete ? "复习完成！" : "这一课学会了！") : "再练一次就好"}</h1><p>${passed ? "小步走也算进步。你的学习记录已更新，下一课已经为你打开。" : "答对两题就能完成本课。错题会在下面标出来，准备好后再试一轮。"}</p><div class="result-score">${score} / ${item.quiz.length}</div><div class="answer-review">${review}</div><div class="result-actions">${nextButton}<button class="secondary-button" type="button" data-route="today">回到今天</button></div></section>`;
}

function renderReview() {
  const completed = new Set(progress.completedDays);
  const cards = COURSE.filter((item) => completed.has(item.day)).flatMap((item) => item.steps.map((step, index) => {
    const id = `${item.day}-${index}`;
    const flipped = view.openReviewIds.has(id);
    return `<button class="review-card${flipped ? " is-flipped" : ""}" type="button" data-review-id="${id}" aria-expanded="${flipped}">
      <span class="review-day">第 ${String(item.day).padStart(2, "0")} 课 · ${item.title}</span>
      <strong class="review-japanese" lang="ja">${step.japanese}</strong>
      ${flipped ? `<span class="review-romaji">${step.romaji}</span><span class="review-meaning">${step.meaning}</span>` : `<span class="review-hint">点一下翻开答案</span>`}
    </button>`;
  }));
  if (!cards.length) {
    return `<div class="page-heading"><div><div class="eyebrow">复习一下</div><h1>把学过的内容记牢</h1><p>完成第一课后，学过的词和句子就会出现在这里。</p></div></div><section class="empty-state"><div class="empty-mark" aria-hidden="true">あ</div><h2>词卡还在等你</h2><p>开始第一课，之后可以随时翻看已学内容。</p><button class="primary-button" type="button" data-action="open-current">开始今天的课 <span aria-hidden="true">→</span></button></section>`;
  }
  return `<div class="page-heading"><div><div class="eyebrow">轻松回顾</div><h1>把学过的内容记牢</h1><p>先看日语，想一想怎么读，再点卡片翻开答案。</p></div><div class="date-label">${cards.length} 张词卡</div></div><div class="review-list">${cards.join("")}</div>`;
}

function openLesson(day) {
  if (!isLessonUnlocked(day, progress)) {
    showToast("按顺序完成当前课程，就能解锁下一课。");
    return;
  }
  view.lessonDay = day;
  view.screen = "lesson";
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz() {
  view.screen = "quiz";
  view.quizIndex = 0;
  view.selectedChoice = null;
  view.answers = [];
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pickAnswer(index) {
  if (view.selectedChoice !== null) return;
  const item = COURSE[(view.lessonDay ?? 1) - 1];
  if (!item?.quiz[view.quizIndex]) return;
  view.selectedChoice = index;
  render();
}

function advanceQuiz() {
  if (view.selectedChoice === null) return;
  view.answers.push(view.selectedChoice);
  const item = COURSE[(view.lessonDay ?? 1) - 1];
  if (view.quizIndex + 1 < item.quiz.length) {
    view.quizIndex += 1;
    view.selectedChoice = null;
    render();
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    view.screen = "result";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function routeTo(route) {
  view.screen = route;
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToWeek(week) {
  view.screen = "roadmap";
  render();
  requestAnimationFrame(() => document.querySelector(`#week-${week}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2900);
}

function speak(text) {
  speakJapanese(text, {
    synthesis: window.speechSynthesis,
    Utterance: window.SpeechSynthesisUtterance,
    onError: (error) => {
      if (error === "canceled" || error === "interrupted") return;
      if (error === "unsupported") {
        showToast("这个浏览器不支持语音朗读，可以跟着罗马音练习。");
      } else if (error === "voice-unavailable" || error === "language-unavailable") {
        showToast("设备没有可用的日语语音，请在系统语音设置中添加日语。");
      } else if (error === "not-allowed") {
        showToast("浏览器阻止了语音播放，请检查页面或设备的声音设置。");
      } else {
        showToast("朗读失败，请检查设备音量或浏览器语音设置。");
      }
    },
  });
}

main.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-route]");
  if (!target) return;
  if (target.dataset.route) {
    routeTo(target.dataset.route);
    return;
  }
  if (target.dataset.day) {
    openLesson(Number(target.dataset.day));
    return;
  }
  if (target.dataset.week) {
    goToWeek(Number(target.dataset.week));
    return;
  }
  if (target.dataset.choice !== undefined) {
    pickAnswer(Number(target.dataset.choice));
    return;
  }
  if (target.dataset.reviewId) {
    const id = target.dataset.reviewId;
    if (view.openReviewIds.has(id)) view.openReviewIds.delete(id);
    else view.openReviewIds.add(id);
    render();
    return;
  }
  switch (target.dataset.action) {
    case "open-current": {
      const current = getCurrentLesson(progress);
      openLesson(current ?? 30);
      break;
    }
    case "start-quiz": startQuiz(); break;
    case "next-question": advanceQuiz(); break;
    case "back": routeTo("today"); break;
    case "back-to-lesson": view.screen = "lesson"; render(); break;
    case "retry": startQuiz(); break;
    case "next-lesson": openLesson(Math.min((view.lessonDay ?? 1) + 1, 30)); break;
    case "speak": speak(target.dataset.text ?? ""); break;
  }
});

nav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (button) routeTo(button.dataset.route);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === "accepted") showToast("已开始添加到主屏幕。每天打开就能接着学。");
  installPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Offline support is optional; learning still works when caching is unavailable.
  });
}

render();
