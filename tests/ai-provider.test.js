"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { generateDeck, parseJsonContent } = require("../packages/ai-provider");

const input = { title: "AI 工作台", brief: "介绍工作流", audience: "产品团队", tone: "专业", slideCount: 2, direction: "modern" };

test("requires a server-side API key", async () => {
  await assert.rejects(() => generateDeck(input, {}, async () => { throw new Error("must not call"); }), error => error.code === "AI_NOT_CONFIGURED");
});

test("rejects an empty brief", async () => {
  await assert.rejects(() => generateDeck({ ...input, brief: "" }, { AI_API_KEY: "test" }), error => error.code === "INVALID_BRIEF");
});

test("generates a validated deck using an OpenAI-compatible response", async () => {
  let request;
  const fakeFetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ slides: [
        { title: "问题", body: "描述挑战", notes: "说明背景" },
        { title: "方案", body: "介绍路径", notes: "" }
      ] }) } }] })
    };
  };
  const result = await generateDeck(input, {
    AI_API_KEY: "server-secret",
    AI_BASE_URL: "https://example.test/v1/",
    AI_MODEL: "test-model"
  }, fakeFetch);
  assert.equal(request.url, "https://example.test/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer server-secret");
  assert.equal(result.slides.length, 2);
  assert.equal(result.design.direction, "modern");
  assert.equal(result.slides[0].id, "slide-1");
});

test("rejects malformed model JSON", async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "not json" } }] }) });
  await assert.rejects(() => generateDeck(input, { AI_API_KEY: "test" }, fakeFetch), /有效 JSON/);
});

test("parses optional JSON code fences", () => {
  assert.deepEqual(parseJsonContent(' ```json\n{"slides":[]}\n``` '), { slides: [] });
});

test("AI review returns bounded, normalized findings", async () => {
  const { reviewDeckWithAI } = require("../packages/ai-provider");
  const sample = {
    schemaVersion: "1.0.0",
    metadata: { title: "Deck", audience: "Team", brief: "Brief", tone: "Clear" },
    design: { direction: "editorial", aspectRatio: "16:9", theme: "editorial" },
    slides: [{ id: "s1", order: 1, layout: "title-body", title: "Intro", body: "Context", notes: "" }]
  };
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ findings: [{ slide: 1, severity: "warning", issue: "信息不足", suggestion: "补充证据" }] }) } }] }) });
  const result = await reviewDeckWithAI(sample, { AI_API_KEY: "test" }, fakeFetch);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].slide, 1);
  assert.equal(result.findings[0].severity, "warning");
});

test("rewrites one slide using a structured response", async () => {
  const { rewriteSlide } = require("../packages/ai-provider");
  const deck = {
    schemaVersion: "1.0.0",
    metadata: { title: "Deck", audience: "Team", brief: "Brief", tone: "Clear" },
    design: { direction: "editorial", aspectRatio: "16:9", theme: "editorial" },
    slides: [{ id: "s1", order: 1, layout: "title-body", title: "Old title", body: "Old body", notes: "" }]
  };
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: "New title", body: "New body", notes: "New notes" }) } }] }) });
  const result = await rewriteSlide(deck, 0, "Make it clearer", { AI_API_KEY: "test" }, fakeFetch);
  assert.deepEqual(result, { title: "New title", body: "New body", notes: "New notes" });
});

test("AI can select chart and metric layouts only when numbers appear in the brief", async () => {
  const detailedInput = { ...input, brief: "Revenue was 12 in 2022 and 24 in 2024.", slideCount: 2 };
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ slides: [
      { title: "Revenue trend", body: "Revenue increased across the period.", notes: "", layout: "chart", chartType: "bar", chartLabels: ["2022", "2024"], chartValues: [12, 24] },
      { title: "Revenue milestone", body: "The reported value reached the period high.", notes: "", layout: "metric-highlight", metricValue: "24", metricLabel: "Revenue in 2024" }
    ] }) } }] })
  });
  const result = await generateDeck(detailedInput, { AI_API_KEY: "test" }, fakeFetch);
  assert.equal(result.slides[0].layout, "chart");
  assert.deepEqual(result.slides[0].chartValues, [12, 24]);
  assert.equal(result.slides[1].layout, "metric-highlight");
  assert.equal(result.slides[1].metricValue, "24");
});

test("AI layout normalization falls back when a metric is unsupported by the brief", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ slides: [
      { title: "Growth", body: "The product grew.", notes: "", layout: "metric-highlight", metricValue: "99%", metricLabel: "Growth" },
      { title: "Summary", body: "A concise summary.", notes: "" }
    ] }) } }] })
  });
  const result = await generateDeck(input, { AI_API_KEY: "test" }, fakeFetch);
  assert.equal(result.slides[0].layout, "title-body");
  assert.equal(result.slides[0].metricValue, undefined);
});
