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

  const baseUrl = String(env.AI_BASE_URL || "https://api.openai.com/v1").replace(new RegExp("/+$"), "");
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


async function reviewDeckWithAI(deck, env = process.env, fetchImpl = fetch) {
  const validation = validateDeck(deck);
  if (!validation.valid) {
    const error = new Error("Invalid deck: " + validation.errors.join("; "));
    error.code = "INVALID_DECK";
    error.details = validation.errors;
    throw error;
  }
  const apiKey = env.AI_API_KEY;
  if (!apiKey) {
    const error = new Error("尚未配置 AI_API_KEY。请在服务端环境变量中配置。");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  const baseUrl = String(env.AI_BASE_URL || "https://api.openai.com/v1").replace(new RegExp("/+$"), "");
  const model = env.AI_MODEL || "gpt-4o-mini";
  const compact = {
    title: deck.metadata.title,
    audience: deck.metadata.audience,
    brief: deck.metadata.brief,
    direction: deck.design.direction,
    slides: deck.slides.map((slide, index) => ({ slide: index + 1, title: slide.title, body: slide.body }))
  };
  let response;
  try {
    response = await fetchImpl(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是严谨的演示文稿编辑。只返回 JSON，不得编造事实或来源。" },
          { role: "user", content: "评审以下演示文稿。检查故事线、重复、可读性、信息密度、受众匹配和缺少证据的事实陈述。只指出可操作的问题，不要把主观偏好说成错误。返回 JSON：{\\"findings\\":[{\\"slide\\":1,\\"severity\\":\\"error|warning|info\\",\\"issue\\":\\"问题\\",\\"suggestion\\":\\"具体改进建议\\"}]}。最多 12 条；没有问题时返回空数组。\\n" + JSON.stringify(compact) }
        ]
      }),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    const wrapped = new Error("调用 AI 评审服务失败：" + (error.name === "TimeoutError" ? "请求超时" : error.message));
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
  const parsed = parseJsonContent(payload?.choices?.[0]?.message?.content);
  if (!Array.isArray(parsed.findings)) throw Object.assign(new Error("AI 评审结果格式无效"), { code: "AI_INVALID_OUTPUT" });
  const findings = parsed.findings.slice(0, 12).map(item => ({
    slide: Number.isInteger(item.slide) && item.slide >= 1 && item.slide <= deck.slides.length ? item.slide : null,
    severity: ["error", "warning", "info"].includes(item.severity) ? item.severity : "info",
    issue: String(item.issue || "未提供问题描述").slice(0, 500),
    suggestion: String(item.suggestion || "请人工复核该页面。").slice(0, 1000)
  }));
  return { model, findings, reviewedSlides: deck.slides.length, note: "AI 评审是建议，不是事实核验；请由作者确认后再修改。" };
}


async function rewriteSlide(deck, slideIndex, instruction, env = process.env, fetchImpl = fetch) {
  const validation = validateDeck(deck);
  if (!validation.valid) throw Object.assign(new Error("Invalid deck: " + validation.errors.join("; ")), { code: "INVALID_DECK", details: validation.errors });
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= deck.slides.length) throw Object.assign(new Error("页面索引无效"), { code: "INVALID_SLIDE_INDEX" });
  const request = String(instruction || "").trim().slice(0, 1000);
  if (!request) throw Object.assign(new Error("请填写本页修改要求"), { code: "INVALID_INSTRUCTION" });
  const apiKey = env.AI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("尚未配置 AI_API_KEY。请在服务端环境变量中配置。"), { code: "AI_NOT_CONFIGURED" });
  const baseUrl = String(env.AI_BASE_URL || "https://api.openai.com/v1").replace(new RegExp("/+$"), "");
  const model = env.AI_MODEL || "gpt-4o-mini";
  const current = deck.slides[slideIndex];
  const neighbors = deck.slides.map((slide, index) => ({ slide: index + 1, title: slide.title })).filter(item => Math.abs(item.slide - (slideIndex + 1)) <= 1);
  const prompt = "请只重写指定页面，保持整个演示文稿故事线连贯。不要编造数据、引文或事实。只返回 JSON：{\\"title\\":\\"...\\",\\"body\\":\\"...\\",\\"notes\\":\\"...\\"}。\\n" +
    "演示文稿标题：" + deck.metadata.title + "\\n受众：" + deck.metadata.audience + "\\n简报：" + deck.metadata.brief + "\\n视觉方向：" + deck.design.direction +
    "\\n相邻页面标题：" + JSON.stringify(neighbors) + "\\n当前页面：" + JSON.stringify({ title: current.title, body: current.body, notes: current.notes }) +
    "\\n修改要求：" + request;
  let response;
  try {
    response = await fetchImpl(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.5, response_format: { type: "json_object" }, messages: [
        { role: "system", content: "你是专业演示文稿编辑，只返回 JSON，不得伪造事实。" },
        { role: "user", content: prompt }
      ] }),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    throw Object.assign(new Error("调用 AI 改写服务失败：" + (error.name === "TimeoutError" ? "请求超时" : error.message)), { code: "AI_UPSTREAM_ERROR" });
  }
  if (!response.ok) throw Object.assign(new Error("AI 服务返回 HTTP " + response.status), { code: "AI_UPSTREAM_ERROR", statusCode: 502 });
  const payload = await response.json();
  const parsed = parseJsonContent(payload?.choices?.[0]?.message?.content);
  if (typeof parsed.title !== "string" || typeof parsed.body !== "string") throw Object.assign(new Error("AI 改写结果缺少 title/body"), { code: "AI_INVALID_OUTPUT" });
  const result = {
    title: parsed.title.slice(0, 300),
    body: parsed.body.slice(0, 10000),
    notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 10000) : current.notes || ""
  };
  if (!result.title.trim() || !result.body.trim()) throw Object.assign(new Error("AI 改写结果不能为空"), { code: "AI_INVALID_OUTPUT" });
  return result;
}

module.exports = { generateDeck, reviewDeckWithAI, rewriteSlide, parseJsonContent };
