# Phase 5 — Quality Review and Draft Recovery

## Delivered
- Adds a deterministic deck quality checker for structural validity, empty content, repeated titles and body copy, long titles, dense body text, unusually short/long decks, chart/metric layout mismatches, image alt/source metadata, and optional speaker notes.
- Exposes the report through `POST /api/quality/check`.
- Displays actionable fixes and labels deterministic rule findings separately from AI-generated suggestions; slide-level findings can jump directly to the relevant slide.
- Autosaves the current deck to browser localStorage and adds a restore-draft action.
- Draft storage remains local to the current browser; no server-side account or database is required.

## Quality report semantics
The score is a heuristic, not a guarantee of presentation quality or factual correctness. Errors block a clean status; warnings reduce the score; informational findings are suggestions. Always manually verify facts, source quality, chart integrity, accessibility, and rendering in the target presentation application.

## Privacy
Drafts are stored in the browser's localStorage on the current origin. Do not use a shared browser profile for confidential content. Clearing browser storage removes the local draft.
