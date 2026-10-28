"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { renderDeck } = require("./packages/render-pptx");
const { generateDeck, reviewDeckWithAI, diagnoseStorylineWithAI, rewriteSlide } = require("./packages/ai-provider");
const { reviewDeck } = require("./packages/design-workflow/quality");
const { renderWebsite } = require("./packages/render-html");
const { searchPexels, importPexelsImage } = require("./packages/assets/pexels");
const { createRateLimiter, positiveInteger } = require("./packages/security/rate-limit");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const configuredBodyLimit = Number(process.env.MAX_BODY_BYTES || DEFAULT_MAX_BODY_BYTES);
const MAX_BODY_BYTES = Number.isSafeInteger(configuredBodyLimit) && configuredBodyLimit > 0 ? configuredBodyLimit : DEFAULT_MAX_BODY_BYTES;
const RATE_LIMIT_WINDOW_MS = positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const API_RATE_LIMIT_MAX = positiveInteger(process.env.API_RATE_LIMIT_MAX, 60);
const AI_RATE_LIMIT_MAX = positiveInteger(process.env.AI_RATE_LIMIT_MAX, 10);
const apiRateLimiter = createRateLimiter({ limit: API_RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
const aiRateLimiter = createRateLimiter({ limit: AI_RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
const AI_ENDPOINTS = new Set(["/api/generate/deck", "/api/review/deck", "/api/regenerate/slide"]);

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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
    const limiter = AI_ENDPOINTS.has(url.pathname) ? aiRateLimiter : apiRateLimiter;
    const result = limiter.check(req.socket.remoteAddress || "unknown");
    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return sendJson(res, 429, { error: "请求过于频繁，请稍后重试", code: "RATE_LIMITED", retryAfterSeconds });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { status: "ok", service: "design-studio-export", pptx: true });
  }
  if (req.method === "GET" && url.pathname === "/api/assets/search") {
    try {
      const result = await searchPexels(url.searchParams.get("q"));
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.message, code: error.code || "INTERNAL_ERROR" });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/assets/import") {
    try {
      const input = await readJson(req);
      const result = await importPexelsImage(input);
      return sendJson(res, 200, result);
    } catch (error) {
      if (res.destroyed) return;
      return sendJson(res, error.statusCode || 500, { error: error.message, code: error.code || "INTERNAL_ERROR" });
    }
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
  if (req.method === "POST" && url.pathname === "/api/storyline/diagnose") {
    try { const deck=await readJson(req);return sendJson(res,200,await diagnoseStorylineWithAI(deck)); }
    catch(error){if(res.destroyed)return;const status=error.statusCode||(error.code==="AI_NOT_CONFIGURED"?503:error.code==="INVALID_DECK"?422:["AI_UPSTREAM_ERROR","AI_INVALID_OUTPUT"].includes(error.code)?502:500);return sendJson(res,status,{error:error.message,code:error.code||"INTERNAL_ERROR",details:error.details||undefined});}
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
    res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.pexels.com; connect-src 'self'; form-action 'self'");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log("Design Studio running at http://localhost:" + server.address().port + " (bind " + HOST + ")");
  });
}

module.exports = { server, readJson, rateLimiters: { api: apiRateLimiter, ai: aiRateLimiter }, rateLimits: { api: API_RATE_LIMIT_MAX, ai: AI_RATE_LIMIT_MAX } };
