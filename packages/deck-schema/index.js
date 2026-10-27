"use strict";

const SUPPORTED_SCHEMA_VERSION = "1.0.0";
const DIRECTIONS = new Set(["editorial", "modern", "data"]);
const THEMES = new Set(["editorial", "dark", "analytical"]);
const LAYOUTS = new Set(["title-body", "section-divider", "metric-highlight"]);

function validateDeck(deck) {
  const errors = [];
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return { valid: false, errors: ["Deck must be an object"] };
  }
  if (deck.schemaVersion !== SUPPORTED_SCHEMA_VERSION) errors.push("schemaVersion must be 1.0.0");
  const metadata = deck.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    errors.push("metadata must be an object");
  } else {
    for (const key of ["title", "audience", "brief", "tone"]) {
      if (typeof metadata[key] !== "string") errors.push("metadata." + key + " must be a string");
    }
    if (typeof metadata.title === "string" && metadata.title.length > 300) errors.push("metadata.title exceeds 300 characters");
    if (typeof metadata.brief === "string" && metadata.brief.length > 10000) errors.push("metadata.brief exceeds 10000 characters");
  }
  const design = deck.design;
  if (!design || typeof design !== "object" || Array.isArray(design)) {
    errors.push("design must be an object");
  } else {
    if (!DIRECTIONS.has(design.direction)) errors.push("design.direction is unsupported");
    if (design.aspectRatio !== "16:9") errors.push("design.aspectRatio must be 16:9");
    if (!THEMES.has(design.theme)) errors.push("design.theme is unsupported");
  }
  if (!Array.isArray(deck.slides) || deck.slides.length < 1 || deck.slides.length > 100) {
    errors.push("slides must contain between 1 and 100 slides");
  } else {
    deck.slides.forEach((slide, index) => {
      const prefix = "slides[" + index + "]";
      if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
        errors.push(prefix + " must be an object");
        return;
      }
      for (const key of ["id", "title", "body", "notes"]) {
        if (typeof slide[key] !== "string") errors.push(prefix + "." + key + " must be a string");
      }
      if (typeof slide.id === "string" && (!slide.id.length || slide.id.length > 100)) errors.push(prefix + ".id length must be 1-100");
      if (typeof slide.title === "string" && slide.title.length > 300) errors.push(prefix + ".title exceeds 300 characters");
      if (typeof slide.body === "string" && slide.body.length > 10000) errors.push(prefix + ".body exceeds 10000 characters");
      if (!Number.isInteger(slide.order) || slide.order < 1) errors.push(prefix + ".order must be a positive integer");
      if (slide.imageData !== undefined) {
        if (typeof slide.imageData !== "string" || slide.imageData.length > 700000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(slide.imageData)) {
          errors.push(prefix + ".imageData must be a PNG, JPEG, or WebP data URL under 700 KB");
        }
      }
      if (slide.imageAlt !== undefined && (typeof slide.imageAlt !== "string" || slide.imageAlt.length > 300)) {
        errors.push(prefix + ".imageAlt must be a string up to 300 characters");
      }
      if (slide.imageSource !== undefined && (typeof slide.imageSource !== "string" || slide.imageSource.length > 500)) errors.push(prefix + ".imageSource must be a string up to 500 characters");
      if (!LAYOUTS.has(slide.layout)) errors.push(prefix + ".layout is unsupported");
      if (slide.metricValue !== undefined && (typeof slide.metricValue !== "string" || slide.metricValue.length > 80)) errors.push(prefix + ".metricValue must be a string up to 80 characters");
      if (slide.metricLabel !== undefined && (typeof slide.metricLabel !== "string" || slide.metricLabel.length > 120)) errors.push(prefix + ".metricLabel must be a string up to 120 characters");
      if (slide.layout === "metric-highlight" && (!String(slide.metricValue || "").trim() || !String(slide.metricLabel || "").trim())) errors.push(prefix + " metric-highlight layout requires metricValue and metricLabel");
    });
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { SUPPORTED_SCHEMA_VERSION, validateDeck };
