"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { renderDeck } = require("./packages/render-pptx");
const { generateDeck, reviewDeckWithAI, rewriteSlide } = require("./packages/ai-provider");
const { reviewDeck } = require("./packages/design-workflow/quality");
const { renderWebsite } = require("./packages/render-html");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const configuredBodyLimit = Number(process.env.MAX_BODY_BYTES || DEFAULT_MAX_BODY_BYTES);
const MAX_BODY_BYTES = Number.isSafeInteger(configuredBodyLimit) && configuredBodyLimit > 0 ? configuredBodyLimit : DEFAULT_MAX_BODY_BYTES;

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function readJson(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("请求内容超过 " + Math.ceil(maxBytes / (1024 * 1024)) + " MB 限制"), { statusCode: 413 }));
        return;
      }
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(Object.assign(new Error("请求体必须是有效 JSON"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { status: "ok", service: "design-studio-export", pptx: true });
  }
  if (req.method === "POST" && url.pathname === "/api/export/site") {
    try {
      const deck = await readJson(req);
      const html = renderWebsite(deck);
      const rawTitle = typeof deck.metadata?.title === "string" ? deck.metadata.title : "website";
      const filename = rawTitle.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "website";
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(html),
        "Content-Disposition": 'attachment; filename="' + filename + '.html"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(html);
    } catch (error) {
      if (res.destroyed) return;
      const status = error.statusCode || (error.code === "INVALID_DECK" ? 422 : 500);
      return sendJson(res, status, { error: error.message, details: error.details || undefined });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/quality/check") {
    try {
      const deck = await readJson(req);
      return sendJson(res, 200, reviewDeck(deck));
    } catch (error) {
      if (res.destroyed) return;
      return sendJson(res, error.statusCode || 400, { error: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/regenerate/slide") {
    try {
      const input = await readJson(req);
      const slide = await rewriteSlide(input.deck, input.slideIndex, input.instruction);
      return sendJson(res, 200, { slideIndex: input.slideIndex, slide });
    } catch (error) {
      if (res.destroyed) return;
      const status = error.statusCode || (error.code === "AI_NOT_CONFIGURED" ? 503 : ["INVALID_DECK", "INVALID_SLIDE_INDEX", "INVALID_INSTRUCTION"].includes(error.code) ? 400 : ["AI_UPSTREAM_ERROR", "AI_INVALID_OUTPUT"].includes(error.code) ? 502 : 500);
      return sendJson(res, status, { error: error.message, code: error.code || "INTERNAL_ERROR", details: error.details || undefined });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/review/deck") {
    try {
      const deck = await readJson(req);
      const result = await reviewDeckWithAI(deck);
      return sendJson(res, 200, result);
    } catch (error) {
      if (res.destroyed) return;
      const status = error.statusCode || (error.code === "AI_NOT_CONFIGURED" ? 503 : error.code === "INVALID_DECK" ? 422 : error.code === "AI_UPSTREAM_ERROR" ? 502 : error.code === "AI_INVALID_OUTPUT" ? 502 : 500);
      return sendJson(res, status, { error: error.message, code: error.code || "INTERNAL_ERROR", details: error.details || undefined });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/generate/deck") {
    try {
      const input = await readJson(req);
      const deck = await generateDeck(input);
      return sendJson(res, 200, deck);
    } catch (error) {
      if (res.destroyed) return;
      const status = error.statusCode || (error.code === "AI_NOT_CONFIGURED" ? 503 : error.code === "INVALID_BRIEF" ? 400 : error.code === "AI_UPSTREAM_ERROR" ? 502 : error.code === "AI_INVALID_OUTPUT" ? 502 : 500);
      return sendJson(res, status, { error: error.message, code: error.code || "INTERNAL_ERROR", details: error.details || undefined });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/export/pptx") {
    try {
      const deck = await readJson(req);
      const buffer = await renderDeck(deck);
      const rawTitle = typeof deck.metadata?.title === "string" ? deck.metadata.title : "presentation";
      const filename = rawTitle.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "presentation";
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Length": buffer.length,
        "Content-Disposition": 'attachment; filename="' + filename + '.pptx"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(buffer);
    } catch (error) {
      if (res.destroyed) return;
      const status = error.statusCode || (error.code === "INVALID_DECK" ? 422 : 500);
      return sendJson(res, status, { error: error.message, details: error.details || undefined });
    }
  }
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log("Design Studio running at http://localhost:" + server.address().port);
  });
}

module.exports = { server, readJson };
