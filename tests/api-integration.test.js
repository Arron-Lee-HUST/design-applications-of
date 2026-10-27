"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { before, after } = require("node:test");
const { server } = require("../server");

const deck = {
  schemaVersion: "1.0.0",
  metadata: { title: "Integration Test", audience: "Product team", brief: "Test API", tone: "Clear" },
  design: { direction: "modern", aspectRatio: "16:9", theme: "dark" },
  slides: [{ id: "slide-1", order: 1, layout: "title-body", title: "Overview", body: "Test content", notes: "" }]
};

let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test("health endpoint returns service status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "design-studio-export", pptx: true });
});

test("workbench is served over HTTP", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /AI Design Studio|设计工作台|设计工作室/);
});

test("quality endpoint accepts a valid deck", async () => {
  const response = await fetch(`${baseUrl}/api/quality/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(deck)
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(Array.isArray(result.findings));
});

test("website export returns a standalone HTML document", async () => {
  const response = await fetch(`${baseUrl}/api/export/site`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(deck)
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Overview/);
});

test("AI rewrite reports an actionable configuration error when no key is set", async () => {
  const response = await fetch(`${baseUrl}/api/regenerate/slide`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deck, slideIndex: 0, instruction: "Make it clearer" })
  });
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.code, "AI_NOT_CONFIGURED");
});
