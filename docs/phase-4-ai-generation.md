# Phase 4 — AI Deck Generation

## Delivered
- Adds an OpenAI-compatible Chat Completions adapter on the server.
- The adapter requests JSON-only slide content, maps it to DeckDocument 1.0.0, and validates the result before returning it.
- Adds `POST /api/generate/deck` integration in the local server and an AI generation action in the UI.
- API keys remain server-side and are read from environment variables only.
- Provider endpoint and model are configurable for compatible hosted or locally deployed services.

## Configuration
Set these environment variables before starting the server:

- `AI_BASE_URL`: API root, default `https://api.openai.com/v1`.
- `AI_API_KEY`: secret key for the configured provider; required for AI generation.
- `AI_MODEL`: model identifier, default `gpt-4o-mini`.
- `PORT`: local server port, default `3000`.

The provider must implement an OpenAI-compatible `POST /chat/completions` endpoint and accept `response_format: { type: "json_object" }`. For local inference, set `AI_BASE_URL` to the local service API root and set the model name supported by that service.

## Design
The browser sends only the brief, desired slide count, and selected design direction. Credentials are never sent to the browser. Generation times out after 45 seconds. Inputs are bounded; output is parsed, capped, and validated against the deck model. The model is instructed not to invent statistics, citations, or research findings.

## Limitations
Provider compatibility varies: some OpenAI-compatible services ignore JSON mode or use different response envelopes. Those responses fail validation and show an error rather than silently replacing the current deck. Generation requires the user to configure a provider; no default key is bundled.

## AI design review
The editor also offers **AI 设计评审**, backed by `POST /api/review/deck`. It reviews narrative progression, repetition, readability, density, audience fit, and unsupported factual claims, returning at most 12 slide-specific suggestions. It does not silently rewrite the deck; the author decides which suggestions to apply. The review is advisory and cannot verify facts without source material.
