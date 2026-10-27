"use strict";

const { validateDeck } = require("../deck-schema");

function reviewDeck(deck) {
  const validation = validateDeck(deck);
  if (!deck || typeof deck !== "object" || Array.isArray(deck) || !Array.isArray(deck.slides)) {
    return { score: 0, status: "blocked", summary: "文档结构未通过校验，请先修复数据问题。",
      findings: validation.errors.map(message => ({ severity: "error", code: "SCHEMA_INVALID", source: "rule", message, recommendation: "按数据校验错误修复字段后，再重新运行质量检查。" })) };
  }
  const findings = validation.errors.map(message => ({
    severity: "error", code: "SCHEMA_INVALID", source: "rule", message,
    recommendation: "修复对应字段后重新运行检查；若问题指向某一页，请在大纲中检查该页布局和必填数据。"
  }));
  const add = (severity, code, message, slideIndex, recommendation) => {
    const item = { severity, code, source: "rule", message, recommendation };
    if (Number.isInteger(slideIndex)) item.slide = slideIndex + 1;
    findings.push(item);
  };
  const slides = deck.slides;
  if (slides.length < 3) add("warning", "SHORT_DECK", "页面少于 3 页；请确认是否覆盖背景、核心方案与结论。", undefined, "检查是否需要补充背景、核心内容和结论；极简演示可忽略此提示。");
  if (slides.length > 20) add("warning", "LONG_DECK", "页面超过 20 页；请检查叙事节奏和是否可以精简。", undefined, "合并重复观点，并确认每一页都推动故事线向前。");
  const seenTitles = new Map(), seenBodies = new Map();
  slides.forEach((slide, index) => {
    if (!slide || typeof slide !== "object" || Array.isArray(slide)) return;
    const title = typeof slide.title === "string" ? slide.title.trim() : "";
    const body = typeof slide.body === "string" ? slide.body.trim() : "";
    const notes = typeof slide.notes === "string" ? slide.notes : "";
    if (!title) add("error", "EMPTY_TITLE", "页面标题为空。", index, "补充一句表达本页结论的标题；避免只写“介绍”或“其他”。");
    if (!body) add("warning", "EMPTY_BODY", "页面正文为空。", index, "添加支持标题的关键证据、解释或下一步行动；若是纯视觉页，可保留并人工确认。");
    if (title.length > 70) add("warning", "LONG_TITLE", "标题超过 70 个字符，可能影响视觉层级。", index, "将标题改为一个明确观点，把背景和限定条件移到正文或讲者备注。");
    if (body.length > 280) add("warning", "DENSE_BODY", "正文超过 280 个字符，可能造成阅读负担。", index, "提炼为 3–5 个要点，或拆成多页；详细解释可移至讲者备注。");
    if (body && body.length < 18) add("info", "SPARSE_BODY", "正文较短；请确认是否有足够上下文支撑标题。", index, "检查是否需要补充证据、例子或行动；若本页用于章节过渡，短正文可能是合理的。");
    const normalizedTitle = title.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
    if (normalizedTitle && seenTitles.has(normalizedTitle)) add("warning", "DUPLICATE_TITLE", "标题与第 " + seenTitles.get(normalizedTitle) + " 页重复。", index, "让标题直接表达本页独有的结论，或合并重复页面。");
    else if (normalizedTitle) seenTitles.set(normalizedTitle, index + 1);
    const normalizedBody = body.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
    if (normalizedBody.length >= 30 && seenBodies.has(normalizedBody)) add("warning", "DUPLICATE_CONTENT", "正文内容与第 " + seenBodies.get(normalizedBody) + " 页重复。", index, "确认两页是否重复表达同一观点；保留一页，或补充新的证据、角度或行动。");
    else if (normalizedBody.length >= 30) seenBodies.set(normalizedBody, index + 1);
    if (slide.layout === "metric-highlight" && (!String(slide.metricValue || "").trim() || !String(slide.metricLabel || "").trim()))
      add("warning", "METRIC_INCOMPLETE", "关键指标布局缺少指标数值或说明。", index, "填写可追溯的指标数值和清晰的指标名称；若没有可靠数据，请改用标准内容布局。");
    if (slide.layout === "chart") {
      const labels = Array.isArray(slide.chartLabels) ? slide.chartLabels : [];
      const values = Array.isArray(slide.chartValues) ? slide.chartValues : [];
      if (labels.length < 2 || labels.length > 8 || labels.length !== values.length || values.some(value => typeof value !== "number" || !Number.isFinite(value)))
        add("warning", "CHART_DATA_MISMATCH", "图表分类与数值不匹配，或数据点不在 2–8 个范围内。", index, "确保分类标签和数值一一对应，且都包含 2–8 项有效数据。");
      if (body.length > 220) add("info", "CHART_TEXT_DENSE", "图表页正文较长，可能与图表争夺注意力。", index, "保留图表要传达的结论，解释性细节可放进讲者备注。");
    }
    if (slide.layout === "section-divider" && body.length > 180)
      add("info", "SECTION_DIVIDER_DENSE", "章节分隔页正文偏长，可能削弱章节标题的强调效果。", index, "将章节页收敛为主题或一句引导语，把背景说明放到下一页。");
    if (slide.imageData && !String(slide.imageAlt || "").trim())
      add("warning", "IMAGE_ALT_MISSING", "页面图片缺少替代文本，不利于无障碍阅读。", index, "填写简洁的图片说明，描述图片对理解本页内容的作用。");
    if (slide.imageData && !String(slide.imageSource || "").trim())
      add("info", "IMAGE_SOURCE_MISSING", "页面图片未记录来源或许可信息。", index, "补充原始来源链接、摄影师和许可说明，交付前确认使用权限。");
    if (!notes.trim()) add("info", "NO_SPEAKER_NOTES", "没有讲者备注（可选）。", index, "为关键数据、案例来源或需要口头解释的内容添加备注。");
  });
  const errors = findings.filter(item => item.severity === "error").length;
  const warnings = findings.filter(item => item.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 8);
  const status = errors ? "blocked" : warnings ? "review" : "good";
  const summary = status === "blocked" ? "发现必须修复的问题。" : status === "review" ? "结构正常，但仍有可读性、重复内容或布局适配风险需要检查。" : "基础自动检查通过；仍建议人工核对事实、证据和视觉效果。";
  return { score, status, summary, findings };
}
module.exports = { reviewDeck };
