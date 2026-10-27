"use strict";

const { validateDeck } = require("../deck-schema");

function reviewDeck(deck) {
  const validation = validateDeck(deck);
  if (!validation.valid) {
    return {
      score: 0,
      status: "blocked",
      summary: "文档结构未通过校验，请先修复数据问题。",
      findings: validation.errors.map(message => ({ severity: "error", code: "SCHEMA_INVALID", message }))
    };
  }

  const findings = [];
  const add = (severity, code, message, slideIndex) => {
    const item = { severity, code, message };
    if (Number.isInteger(slideIndex)) item.slide = slideIndex + 1;
    findings.push(item);
  };
  const slides = deck.slides;
  if (slides.length < 3) add("warning", "SHORT_DECK", "页面少于 3 页；请确认是否覆盖背景、核心方案与结论。");
  if (slides.length > 20) add("warning", "LONG_DECK", "页面超过 20 页；请检查叙事节奏和是否可以精简。");

  const seenTitles = new Map();
  slides.forEach((slide, index) => {
    const title = slide.title.trim();
    const body = slide.body.trim();
    if (!title) add("error", "EMPTY_TITLE", "页面标题为空。", index);
    if (!body) add("warning", "EMPTY_BODY", "页面正文为空。", index);
    if (title.length > 70) add("warning", "LONG_TITLE", "标题超过 70 个字符，可能影响视觉层级。", index);
    if (body.length > 280) add("warning", "DENSE_BODY", "正文超过 280 个字符，建议拆页或提炼要点。", index);
    if (body && body.length < 18) add("info", "SPARSE_BODY", "正文较短；请确认是否有足够上下文支撑标题。", index);
    const normalized = title.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
    if (normalized && seenTitles.has(normalized)) {
      add("warning", "DUPLICATE_TITLE", "标题与第 " + seenTitles.get(normalized) + " 页重复。", index);
    } else if (normalized) {
      seenTitles.set(normalized, index + 1);
    }
    if (!slide.notes.trim()) add("info", "NO_SPEAKER_NOTES", "没有讲者备注（可选）。", index);
  });

  const errors = findings.filter(item => item.severity === "error").length;
  const warnings = findings.filter(item => item.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8);
  const status = errors ? "blocked" : warnings ? "review" : "good";
  const summary = status === "blocked" ? "发现必须修复的问题。" :
    status === "review" ? "结构正常，但仍有一些可读性或叙事风险需要检查。" :
    "基础自动检查通过；仍建议人工核对事实、证据和视觉效果。";
  return { score, status, summary, findings };
}

module.exports = { reviewDeck };
