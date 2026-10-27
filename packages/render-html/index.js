"use strict";

const { validateDeck } = require("../deck-schema");

const THEMES = {
  editorial: { background: "#f3eee5", ink: "#242321", muted: "#62605a", accent: "#a98762", font: "Georgia, 'Times New Roman', serif" },
  modern: { background: "#191a20", ink: "#f7f7f3", muted: "#c4c6cb", accent: "#b9ff66", font: "Inter, Arial, sans-serif" },
  analytical: { background: "#e8edff", ink: "#182653", muted: "#4e5c86", accent: "#6575d7", font: "Inter, Arial, sans-serif" }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderChartSvg(slide, theme) {
  const labels = slide.chartLabels || [];
  const values = slide.chartValues || [];
  if (labels.length < 2 || labels.length !== values.length) return "";
  const max = Math.max(1, ...values);
  const left = 34, right = 566, top = 22, bottom = 150;
  const step = (right - left) / Math.max(1, labels.length - 1);
  const points = values.map((value, index) => {
    const x = slide.chartType === "bar" ? left + step * index : left + step * index;
    const y = bottom - (value / max) * (bottom - top);
    return { x, y, value, label: labels[index] };
  });
  const grid = [0, 0.5, 1].map(ratio => {
    const y = bottom - ratio * (bottom - top);
    return '<line class="chart-grid" x1="' + left + '" y1="' + y + '" x2="' + right + '" y2="' + y + '"></line>';
  }).join("");
  let marks;
  if (slide.chartType === "line") {
    marks = '<polyline fill="none" stroke="' + theme.accent + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="' + points.map(p => p.x + "," + p.y).join(" ") + '"></polyline>' +
      points.map(p => '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="' + theme.accent + '"><title>' + escapeHtml(p.label + ": " + p.value) + '</title></circle>').join("");
  } else {
    const barWidth = Math.min(42, step * 0.58);
    marks = points.map(p => {
      const height = Math.max(1, bottom - p.y);
      return '<rect x="' + (p.x - barWidth / 2) + '" y="' + p.y + '" width="' + barWidth + '" height="' + height + '" rx="4" fill="' + theme.accent + '"></rect><text class="chart-value" x="' + p.x + '" y="' + Math.max(14, p.y - 7) + '" text-anchor="middle">' + escapeHtml(p.value) + '</text>';
    }).join("");
  }
  const labelMarks = points.map(p => '<text x="' + p.x + '" y="180" text-anchor="middle">' + escapeHtml(p.label) + '</text>').join("");
  const valueMarks = slide.chartType === "line" ? points.map(p => '<text class="chart-value" x="' + p.x + '" y="' + Math.max(13, p.y - 10) + '" text-anchor="middle">' + escapeHtml(p.value) + '</text>').join("") : "";
  return '<div class="chart-wrap"><svg viewBox="0 0 600 205" role="img" aria-label="' + escapeHtml(slide.title + " chart") + '">' + grid + marks + valueMarks + labelMarks + '</svg></div>';
}

function renderWebsite(deck) {
  const validation = validateDeck(deck);
  if (!validation.valid) {
    const error = new Error("Invalid deck: " + validation.errors.join("; "));
    error.code = "INVALID_DECK";
    error.details = validation.errors;
    throw error;
  }
  const theme = THEMES[deck.design.direction] || THEMES.editorial;
  const title = escapeHtml(deck.metadata.title || "Untitled");
  const audience = escapeHtml(deck.metadata.audience || "");
  const brief = escapeHtml(deck.metadata.brief || "");
  const cards = deck.slides.map((slide, index) => {
    const id = "section-" + (index + 1);
    const image = slide.imageData ? '<img class="story-image" src="' + slide.imageData + '" alt="' + escapeHtml(slide.imageAlt || slide.title || "Slide image") + '" loading="lazy">' + (slide.imageSource ? '<small class="image-credit">图片来源：' + escapeHtml(slide.imageSource) + '</small>' : "") : "";
    const layout = ["title-body", "section-divider", "metric-highlight", "chart"].includes(slide.layout) ? slide.layout : "title-body";
    const metric = layout === "metric-highlight" ? '<div class="metric-callout"><strong>' + escapeHtml(slide.metricValue || "") + '</strong><span>' + escapeHtml(slide.metricLabel || "") + '</span></div>' : "";
    const chart = layout === "chart" ? renderChartSvg(slide, theme) : "";
    return '<section class="story layout-' + layout + '" id="' + id + '"><div class="index">' + String(index + 1).padStart(2, "0") + '</div><div class="story-copy"><h2>' + escapeHtml(slide.title) + '</h2>' + metric + '<p>' + escapeHtml(slide.body).replace(/\n/g, "<br>") + '</p>' + chart + image + '</div></section>';
  }).join("\n");
  const nav = deck.slides.map((slide, index) => '<a href="#section-' + (index + 1) + '">' + escapeHtml(slide.title || ("Section " + (index + 1))) + '</a>').join("\n");
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="' + brief.slice(0, 300) + '"><title>' + title + '</title><style>' +
    ':root{color-scheme:' + (deck.design.direction === "modern" ? "dark" : "light") + ';--bg:' + theme.background + ';--ink:' + theme.ink + ';--muted:' + theme.muted + ';--accent:' + theme.accent + ';--font:' + theme.font + '}' +
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.6}.layout{display:grid;grid-template-columns:250px minmax(0,1fr);max-width:1440px;margin:auto;min-height:100vh}.rail{position:sticky;top:0;height:100vh;overflow:auto;padding:32px 24px;border-right:1px solid color-mix(in srgb,var(--ink) 18%,transparent);font-family:Arial,sans-serif}.brand{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}.rail h1{font:700 24px/1.12 var(--font);letter-spacing:-.04em;margin:28px 0 12px}.rail p{font-size:12px;color:var(--muted)}nav{display:grid;gap:8px;margin-top:30px}nav a{font-size:12px;color:var(--muted);text-decoration:none;padding:7px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}nav a:hover,nav a:focus{color:var(--accent)}main{min-width:0}.hero{padding:clamp(48px,9vw,130px) clamp(24px,8vw,120px) 80px;border-bottom:1px solid color-mix(in srgb,var(--ink) 18%,transparent);position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:clamp(140px,24vw,330px);height:clamp(140px,24vw,330px);border:1px solid var(--accent);border-radius:50%;right:-8%;top:12%;box-shadow:0 0 0 20px transparent,0 0 0 21px var(--accent),0 0 0 42px transparent,0 0 0 43px var(--accent);opacity:.5}.eyebrow{font:11px Arial,sans-serif;letter-spacing:.2em;color:var(--accent);text-transform:uppercase}.hero h2{font:700 clamp(38px,6.5vw,86px)/.98 var(--font);letter-spacing:-.06em;max-width:900px;margin:30px 0;position:relative;z-index:1}.hero p{font:clamp(15px,1.5vw,20px)/1.7 Arial,sans-serif;color:var(--muted);max-width:650px;position:relative;z-index:1}.story{display:grid;grid-template-columns:70px minmax(0,1fr);gap:28px;padding:clamp(38px,7vw,90px) clamp(24px,8vw,120px);border-bottom:1px solid color-mix(in srgb,var(--ink) 14%,transparent);scroll-margin-top:24px}.index{font:12px Arial,sans-serif;color:var(--accent);padding-top:10px}.story h2{font:700 clamp(25px,3.2vw,42px)/1.12 var(--font);letter-spacing:-.04em;margin:0 0 18px;max-width:850px}.story p{font:clamp(15px,1.35vw,18px)/1.8 Arial,sans-serif;color:var(--muted);max-width:760px;margin:0;white-space:normal}.chart-wrap{width:min(100%,920px);margin:22px 0 0}.chart-wrap svg{display:block;width:100%;height:auto;overflow:visible}.chart-wrap text{fill:var(--muted);font:12px Arial,sans-serif}.chart-wrap .chart-value{fill:var(--ink);font-weight:700}.chart-wrap .chart-grid{stroke:color-mix(in srgb,var(--ink) 14%,transparent);stroke-width:1}.story.layout-section-divider .story-copy{align-self:center}.story.layout-section-divider h2{font-size:clamp(38px,6vw,72px);max-width:100%}.story.layout-section-divider p{font-size:clamp(16px,1.8vw,22px)}.metric-callout{display:flex;flex-direction:column;gap:4px;margin:16px 0 22px}.metric-callout strong{font:700 clamp(48px,8vw,96px)/1 var(--font);color:var(--accent);letter-spacing:-.05em}.metric-callout span{font:700 16px/1.4 Arial,sans-serif;color:var(--ink)}.story-image{display:block;width:min(100%,900px);max-height:480px;object-fit:cover;margin-top:24px;border-radius:8px}.image-credit{display:block;font:11px Arial,sans-serif;color:var(--muted);margin-top:6px}.footer{padding:32px clamp(24px,8vw,120px);font:11px Arial,sans-serif;color:var(--muted)}@media(max-width:800px){.layout{grid-template-columns:1fr}.rail{position:relative;height:auto;border-right:0;border-bottom:1px solid color-mix(in srgb,var(--ink) 18%,transparent);padding:20px 22px}.rail h1{margin:12px 0}.rail p{margin:0}nav{display:flex;overflow:auto;gap:16px;margin-top:16px}nav a{white-space:nowrap}.hero{padding:56px 24px}.hero:after{right:-25%;top:0;opacity:.25}.story{grid-template-columns:32px minmax(0,1fr);gap:12px;padding:42px 24px}}@media print{.layout{display:block}.rail{display:none}.hero,.story{break-inside:avoid;padding:36px}.hero:after{display:none}}' +
    '</style></head><body><div class="layout"><aside class="rail"><div class="brand">Design Studio / Web Edition</div><h1>' + title + '</h1><p>' + audience + '</p><nav aria-label="Page sections">' + nav + '</nav></aside><main><header class="hero"><div class="eyebrow">A presentation, made navigable</div><h2>' + title + '</h2><p>' + brief + '</p></header>' + cards + '<footer class="footer">Generated with Design Studio · ' + deck.slides.length + ' sections</footer></main></div></body></html>';
}

module.exports = { renderWebsite, escapeHtml };
