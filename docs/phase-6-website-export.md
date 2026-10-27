# Phase 6 — Responsive Website Export

## Delivered
- Adds a second rendering target for the same DeckDocument model: a self-contained, responsive HTML microsite.
- The output includes a navigation rail, a hero section, linked content sections, mobile layout, print styles, and theme variants for Editorial, Modern, and Analytical.
- Text is HTML-escaped; no external scripts, fonts, or runtime dependencies are required in the exported file.
- The server exposes `POST /api/export/site`; the editor can download the resulting `.html` file.
- Automated tests cover section output, responsive CSS, escaping, and invalid deck rejection.

## Use
Start the app with `npm start`, then choose **导出网页**. The downloaded file can be opened locally or hosted as a static page.

## Scope
This creates a designed, navigable story page from the current deck content; it is not yet a general-purpose arbitrary website builder with forms, database-backed pages, or custom routing. Images and interactive charts remain future extensions.
