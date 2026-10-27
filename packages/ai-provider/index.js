"use strict";

const { validateDeck } = require("../deck-schema");

function parseJsonContent(content) {
  if (typeof content !== "string") throw new Error("模型返回内容不是文本");
  const cleaned = content.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  try { return JSON.parse(cleaned); }
  catch { throw new Error("模型未返回有效 JSON，请重试或更换支持 JSON 输出的模型"); }
}

async function generateDeck(input, env = process.env, fetchImpl = fetch) {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) {
    const error = new Error("尚未配置 AI_API_KEY。请在服务端环境变量中配置，不要把密钥写入前端。");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  const title = String(input.title || "").trim().slice(0, 300);
  const brief = String(input.brief || "").trim().slice(0, 10000);
  const audience = String(input.audience || "").trim().slice(0, 500);
  const tone = String(input.tone || "清晰、专业、有观点").slice(0, 200);
  const direction = ["editorial", "modern", "data"].includes(input.direction) ? input.direction : "editorial";
  const count = Number(input.slideCount);
  const slideCount = Number.isInteger(count) ? Math.max(1, Math.min(30, count)) : 8;
  if (!title || !brief) {
    const error = new Error("标题和项目简报不能为空");
    error.code = "INVALID_BRIEF";
    throw error;
  }

  const baseUrl = String(env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.AI_MODEL || "gpt-4o-mini";
  const prompt = [
    "你是一名资深演示文稿叙事与视觉设计师。根据简报生成高质量中文演示文稿内容。",
    "只返回一个 JSON 对象，不要 Markdown，不要代码围栏，不要解释。",
    "JSON 结构必须为 {\"slides\":[{\"title\":\"...\",\"body\":\"...\",\"notes\":\"...\"}]}。",
    "严格生成 " + slideCount + " 页。每页只表达一个核心观点，标题应有信息量，正文具体且简洁，备注可为空字符串。",
    "不要编造统计数据、引用、研究结论或事实；简报缺少证据时使用定性表达。",
    "项目标题：" + title,
    "目标受众：" + (audience || "一般商务受众"),
    "表达风格：" + tone,
    "视觉方向：" + direction,
    "项目简报：" + brief
  ].join("\n");

  let response;
  try {
    response = await fetchImpl(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你只输出符合要求的 JSON。不要伪造数据、引文或来源。" },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    const wrapped = new Error("调用 AI 服务失败：" + (error.name === "TimeoutError" ? "请求超时" : error.message));
    wrapped.code = "AI_UPSTREAM_ERROR";
    throw wrapped;
  }
  if (!response.ok) {
    const error = new Error("AI 服务返回 HTTP " + response.status);
    error.code = "AI_UPSTREAM_ERROR";
    error.statusCode = 502;
    throw error;
  }
  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonContent(raw);
  if (!Array.isArray(parsed.slides) || parsed.slides.length !== slideCount) {
    const error = new Error("模型返回的页面数量不符合要求，请重试");
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }

  const deck = {
    schemaVersion: "1.0.0",
    metadata: {
      title,
      audience,
      brief,
      tone,
      createdAt: new Date().toISOString()
    },
    design: {
      direction,
      aspectRatio: "16:9",
      theme: direction === "modern" ? "dark" : direction === "data" ? "analytical" : "editorial"
    },
    slides: parsed.slides.map((slide, index) => ({
      id: "slide-" + (index + 1),
      order: index + 1,
      layout: "title-body",
      title: typeof slide.title === "string" ? slide.title.slice(0, 300) : "",
      body: typeof slide.body === "string" ? slide.body.slice(0, 10000) : "",
      notes: typeof slide.notes === "string" ? slide.notes.slice(0, 10000) : ""
    }))
  };
  const validation = validateDeck(deck);
  if (!validation.valid) {
    const error = new Error("模型生成的内容未通过校验：" + validation.errors.join("; "));
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
  return deck;
}

module.exports = { generateDeck, parseJsonContent };
