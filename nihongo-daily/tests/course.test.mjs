import test from "node:test";
import assert from "node:assert/strict";
import * as course from "../src/course.mjs";
const COURSE = course.COURSE ?? [];

test("the course contains 30 ordered lessons with complete three-question quizzes", () => {
  assert.equal(COURSE.length, 30);
  for (const [index, lesson] of COURSE.entries()) {
    assert.equal(lesson.day, index + 1);
    assert.ok(lesson.title.trim());
    assert.ok(lesson.focus.trim());
    assert.ok(Array.isArray(lesson.steps) && lesson.steps.length > 0);
    assert.equal(lesson.quiz.length, 3);
    for (const question of lesson.quiz) {
      assert.ok(question.prompt.trim());
      assert.ok(question.choices.length >= 2);
      assert.ok(Number.isInteger(question.answer));
      assert.ok(question.answer >= 0 && question.answer < question.choices.length);
      assert.ok(question.note.trim());
    }
  }
});
