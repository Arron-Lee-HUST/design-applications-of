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
