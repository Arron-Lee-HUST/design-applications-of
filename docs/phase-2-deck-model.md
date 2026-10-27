# Phase 2 — Portable Deck Model

## Delivered
- A versioned `DeckDocument` format (`schemaVersion: 1.0.0`) is defined in `packages/deck-schema/deck.schema.json`.
- The browser prototype can export a Deck JSON file and import it back into the editor.
- Import validates schema version, page count, required title/body strings, text limits, and supported visual direction before mutating the current editor state.
- A dependency-free Node.js validator and automated tests cover valid data, unsupported versions, slide limits, invalid layouts, oversized titles, and malformed input.
- No server, API key, or third-party runtime dependency is introduced.

## Data contract
A deck contains:
- `metadata`: title, audience, brief, tone, optional creation timestamp.
- `design`: visual direction, aspect ratio, and theme.
- `slides`: ordered slide records with stable IDs, layout type, title, body, and speaker notes.

## Run tests
Requires Node.js 18 or later:

```sh
npm test
```

## Current limits
The browser editor currently supports the `title-body` layout and stores slide content in memory until exported. The import path intentionally rejects unknown schema versions rather than guessing how to migrate them. The JSON Schema file is the interoperability contract; the JavaScript validator provides the zero-dependency runtime checks used in Node tests.

## Next
1. Use the schema as the single source of truth for preview and export.
2. Add explicit schema migrations when a future version changes the document format.
3. Add an editable PPTX renderer with export smoke tests.
4. Add a server-side model adapter; provider secrets must never be embedded in browser code.
