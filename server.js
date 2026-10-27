"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { renderDeck } = require("./packages/render-pptx");
const { generateDeck } = require("./packages/ai-provider");
const { reviewDeck } = require("./packages/design-workflow/quality");
const { renderWebsite } = require("./packages/render-html");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("请求内容超过 2 MB 限制"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
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

server.listen(PORT, () => {
  console.log("Design Studio running at http://localhost:" + PORT);
});

module.exports = { server, readJson };
