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

## Slide image assets
The editor supports a local image upload on each slide (PNG, JPEG, or WebP; 500 KB per file). Image data is embedded into the Deck JSON, HTML website, and PPTX, so the exported deliverables are self-contained. Add alt text for accessibility and record the source/license in the image attribution field. The app does not search the web for images or determine license validity; users are responsible for using assets they are allowed to use.
