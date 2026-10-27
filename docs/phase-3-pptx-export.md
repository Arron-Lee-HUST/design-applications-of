# Phase 3 — Editable PowerPoint Export

## Delivered
- A server-side renderer maps DeckDocument 1.0.0 to native PowerPoint text and shape elements using PptxGenJS.
- Editorial, Modern, and Analytical directions have distinct background, typography, and decorative geometry.
- Speaker notes are preserved when present.
- A small Node HTTP server serves the existing studio and exposes `POST /api/export/pptx`.
- The editor includes an Export PPTX action. It sends the current Deck JSON to the server and downloads the returned file.
- Invalid decks are rejected before rendering; request bodies are capped at 2 MB.
- Automated smoke tests cover ZIP/OOXML output, all three themes, and invalid input. GitHub Actions runs the test suite.

## Run locally
Requires Node.js 18+:

```sh
npm install
npm start
```

Open `http://localhost:3000`, edit a deck, and choose **导出 PPTX**. The resulting file contains editable PowerPoint text boxes and vector shapes; it is not a screenshot of the HTML preview.

## API
- `GET /api/health` — health status.
- `POST /api/export/pptx` — accepts a DeckDocument JSON body and returns an OOXML PowerPoint file.

## Limitations
The current renderer supports the `title-body` layout only and does not yet embed image assets or generate charts. It uses server-side rendering to avoid exposing library dependencies and to provide a stable PPTX response. Browser and end-to-end tests still need to be run in CI after dependencies install.
