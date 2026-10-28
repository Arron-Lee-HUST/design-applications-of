"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");


test("storyline planner previews narrative roles and requires explicit apply with undo", () => {
  for (const id of ["storylinePlanner", "storylineSummary", "storylinePreviewList", "suggestStoryline", "applyStoryline", "undoStoryline", "cancelStoryline"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing storyline control: " + id);
  }
  assert.ok(html.includes("function classifyStoryRole(slide,index,total)"));
  assert.ok(html.includes("function buildStorylineProposal()"));
  assert.ok(html.includes("function applyStorylineProposal()"));
  assert.ok(html.includes("function undoStorylineChange()"));
  assert.ok(html.includes("lastStorylineChange=slides.slice()"));
  assert.ok(html.includes("自动分类只是启发式判断"));
});

test("workbench inline JavaScript parses successfully", () => {
  const start = html.indexOf("<script>");
  const end = html.lastIndexOf("</script>");
  assert.ok(start >= 0 && end > start, "index.html should contain its workbench script");
  const source = html.slice(start + "<script>".length, end);
  assert.doesNotThrow(() => new vm.Script(source, { filename: "index.html" }));
});

test("project manager exposes create, switch, duplicate, rename, and delete controls", () => {
  for (const id of ["projectSelect", "newProject", "duplicateProject", "renameProject", "deleteProject"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing control: " + id);
  }
  assert.ok(html.includes('const PROJECTS_KEY="design-studio-projects"'));
  assert.ok(html.includes("localStorage.setItem(PROJECTS_KEY"));
  assert.ok(html.includes("projectStore.projects.length>=20"));
});

test("project manager retains a migration path from the earlier single-draft key", () => {
  assert.ok(html.includes('localStorage.getItem("design-studio-draft")'));
});

test("slide outline exposes accessible reorder and duplicate controls", () => {
  assert.ok(html.includes('data-up="'));
  assert.ok(html.includes('data-down="'));
  assert.ok(html.includes('data-duplicate="'));
  assert.ok(html.includes('aria-label="上移页面"'));
  assert.ok(html.includes('aria-label="下移页面"'));
  assert.ok(html.includes('aria-label="复制页面"'));
  assert.ok(html.includes("function moveSlide(index,delta)"));
  assert.ok(html.includes("function duplicateSlide(index)"));
  assert.ok(html.includes("if(slides.length>=100)"));
});

test("both export flows run a quality preflight and let users review before continuing", () => {
  assert.ok(html.includes("async function confirmExportQuality(format)"));
  assert.ok(html.includes('confirmExportQuality("网页")'));
  assert.ok(html.includes('confirmExportQuality("PPTX")'));
  assert.ok(html.includes("window.confirm("));
  assert.ok(html.includes("选择“取消”返回编辑"));
});

test("layout optimizer provides deterministic, non-mutating suggestions for charts, metrics, and section dividers", () => {
  const match = html.match(/function suggestLayoutForSlide\(slide\)\{[\s\S]*?\n\}/);
  assert.ok(match, "layout recommendation function should exist");
  const suggestLayoutForSlide = vm.runInNewContext("(" + match[0] + ")");
  const chart = { title: "季度趋势", body: "对比各季度表现", chartLabels: ["Q1", "Q2", "Q3"], chartValues: [10, 14, 18] };
  assert.equal(suggestLayoutForSlide(chart).layout, "chart");
  assert.equal(chart.layout, undefined, "suggesting must not mutate the slide");
  const metric = { title: "转化率提升 25%", body: "核心指标结果" };
  assert.equal(suggestLayoutForSlide(metric).layout, "metric-highlight");
  assert.equal(suggestLayoutForSlide({ title: "总结与下一步行动", body: "明确后续行动与责任人。" }).layout, "section-divider");
  assert.equal(suggestLayoutForSlide({ title: "日常说明", body: "这是一段普通的说明内容。" }), null);
  assert.equal(suggestLayoutForSlide({ title: "季度趋势", body: "", layout: "chart", chartLabels: ["Q1", "Q2"], chartValues: [10, 20] }), null);
});

test("layout optimizer previews before explicit apply and offers one-step layout undo", () => {
  for (const id of ["suggestLayout", "layoutOptimizer", "layoutCompare", "applyLayout", "cancelLayout", "undoLayout"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing layout optimizer control: " + id);
  }
  assert.ok(html.includes("function renderLayoutCard(slide,layout,index)"));
  assert.ok(html.includes("function openLayoutOptimizer()"));
  assert.ok(html.includes("function applyLayoutProposal()"));
  assert.ok(html.includes("function undoLayoutChange()"));
  assert.ok(html.includes('$("#applyLayout").addEventListener("click",applyLayoutProposal)'));
});

test("content splitting preserves source wording and groups paragraphs and bullets", () => {
  const match = html.match(/function splitContentIntoSegments\(body,maxChars=230,maxItems=4\)\{[\s\S]*?\n\}/);
  assert.ok(match, "content splitter should be defined");
  const splitContentIntoSegments = vm.runInNewContext("(" + match[0] + ")");
  const body = "第一段介绍背景。\n\n第二段说明问题。\n\n第三段给出方案。\n\n第四段说明落地。";
  const segments = splitContentIntoSegments(body, 20, 4);
  assert.ok(segments.length >= 2);
  assert.equal(segments.join(" ").replace(/\s+/g, ""), body.replace(/\s+/g, ""));
  assert.equal(splitContentIntoSegments("只有一条短句。").length, 0);
  const bullets = "- 第一项\n- 第二项\n- 第三项\n- 第四项\n- 第五项";
  const bulletSegments = splitContentIntoSegments(bullets, 230, 2);
  assert.ok(bulletSegments.length >= 2);
  assert.equal(bulletSegments.join(" ").replace(/\s+/g, ""), bullets.replace(/\s+/g, ""));
});

test("content split workflow previews before apply and supports undo", () => {
  for (const id of ["suggestSplit", "splitOptimizer", "splitPreviewList", "applySplit", "undoSplit", "cancelSplit"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing split workflow control: " + id);
  }
  assert.ok(html.includes("function openSplitOptimizer()"));
  assert.ok(html.includes("function applySplitProposal()"));
  assert.ok(html.includes("function undoSplitChange()"));
  assert.ok(html.includes("if(slides.length+splitProposal.segments.length-1>100)"));
  assert.ok(html.includes('$("#applySplit").addEventListener("click",applySplitProposal)'));
});
