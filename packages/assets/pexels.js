"use strict";

const MAX_IMAGE_BYTES = 500 * 1024;
const PEXELS_API_BASE_URL = "https://api.pexels.com/v1";

function assetError(message, code, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

async function searchPexels(query, env = process.env, fetchImpl = fetch) {
  const term = String(query || "").trim().slice(0, 120);
  if (term.length < 2) throw assetError("图片搜索词至少需要 2 个字符", "INVALID_ASSET_QUERY", 400);
  const apiKey = env.PEXELS_API_KEY;
  if (!apiKey) throw assetError("尚未配置 PEXELS_API_KEY，暂时无法搜索在线素材", "ASSET_SEARCH_NOT_CONFIGURED", 503);
  const baseUrl = String(env.PEXELS_API_BASE_URL || PEXELS_API_BASE_URL).replace(new RegExp("/+$"), "");
  let response;
  try {
    response = await fetchImpl(baseUrl + "/search?query=" + encodeURIComponent(term) + "&per_page=8&orientation=landscape", {
      headers: { Authorization: apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw assetError("连接图片素材服务失败：" + (error.name === "TimeoutError" ? "请求超时" : error.message), "ASSET_UPSTREAM_ERROR", 502);
  }
  if (!response.ok) throw assetError("图片素材服务返回 HTTP " + response.status, "ASSET_UPSTREAM_ERROR", 502);
  const payload = await response.json();
  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  return {
    provider: "pexels",
    totalResults: Number.isFinite(payload.total_results) ? payload.total_results : photos.length,
    photos: photos.slice(0, 8).map(photo => ({
      id: String(photo.id || ""),
      alt: String(photo.alt || "Pexels 图片").slice(0, 300),
      photographer: String(photo.photographer || "Unknown").slice(0, 120),
      url: String(photo.url || ""),
      src: String(photo.src?.medium || photo.src?.large || "")
    })).filter(photo => photo.id && photo.src && photo.url)
  };
}

async function importPexelsImage(input, fetchImpl = fetch) {
  const imageUrl = new URL(String(input?.imageUrl || ""));
  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "images.pexels.com" || imageUrl.username || imageUrl.password || imageUrl.port) {
    throw assetError("只允许导入 Pexels 官方图片 CDN 上的 HTTPS 图片", "INVALID_ASSET_URL", 400);
  }
  const pageUrl = new URL(String(input?.pageUrl || ""));
  if (pageUrl.protocol !== "https:" || pageUrl.hostname !== "www.pexels.com") {
    throw assetError("图片来源链接必须指向 Pexels 官方页面", "INVALID_ASSET_SOURCE", 400);
  }
  let response;
  try {
    response = await fetchImpl(imageUrl.toString(), { redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch (error) {
    throw assetError("下载图片失败：" + (error.name === "TimeoutError" ? "请求超时" : error.message), "ASSET_UPSTREAM_ERROR", 502);
  }
  if (!response.ok) throw assetError("图片服务返回 HTTP " + response.status, "ASSET_UPSTREAM_ERROR", 502);
  const contentType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const mime = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[contentType];
  if (!mime) throw assetError("图片格式不受支持，仅接受 JPEG、PNG 或 WebP", "INVALID_ASSET_TYPE", 415);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw assetError("图片超过 500 KB，请选择较小的预览图", "ASSET_TOO_LARGE", 413);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw assetError("图片为空或超过 500 KB", "ASSET_TOO_LARGE", 413);
  const alt = String(input.alt || "Pexels 图片").trim().slice(0, 300) || "Pexels 图片";
  const photographer = String(input.photographer || "Unknown").trim().slice(0, 120) || "Unknown";
  return {
    imageData: "data:" + contentType + ";base64," + bytes.toString("base64"),
    imageAlt: alt,
    imageSource: ("Photo by " + photographer + " on Pexels — " + pageUrl.toString()).slice(0, 500)
  };
}

module.exports = { MAX_IMAGE_BYTES, searchPexels, importPexelsImage };
