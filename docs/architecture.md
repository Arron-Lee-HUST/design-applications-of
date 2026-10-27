# Architecture

## Current MVP
The prototype is a self-contained static application in index.html. HTML provides controls and slide structure; CSS provides the responsive workspace and slide rendering; JavaScript owns the in-memory slide model, direction selection, outline editing, navigation, and HTML export. No server, API key, package installation, external font, or network request is required. Content is currently held in memory and is not saved to a backend.

## Source-of-truth model
The UI currently uses a minimal slide model: an array of objects with title and body strings. A later version should promote this to a versioned DeckDocument schema with deck metadata, design tokens, slide layouts, typed elements, asset references, speaker notes, and provenance. Preview and PPTX export should render from the same schema.

## Target architecture
- apps/web: brief capture, direction exploration, outline editor, slide canvas, quality report, export UI.
- apps/api: project/deck persistence, model provider abstraction, generation jobs, asset metadata, export jobs.
- packages/deck-schema: versioned deck types, validation, migrations, design tokens.
- packages/design-workflow: brief analysis, three-direction proposal, narrative outline, generation and review stages.
- packages/render-html: browser preview and HTML export.
- packages/render-pptx: native editable PowerPoint generation.
- docs: requirements, architecture decisions, integration and evaluation notes.

## Generation pipeline
1. Normalize brief: audience, objective, core message, evidence, constraints, desired action.
2. Produce three distinct design directions with rationale and trade-offs.
3. Require a direction choice before full-deck generation.
4. Generate a narrative outline with one key message per slide.
5. Generate structured slide content and visual plans.
6. Resolve assets and track source/usage metadata.
7. Render preview and editable PPTX from the same deck schema.
8. Validate overflow, contrast, font sizes, slide density, missing assets, and factual/source gaps.
9. Return a delivery report and allow targeted regeneration.

## Security and reliability
Keep model-provider secrets on the server; escape generated content before HTML rendering; validate schema and enforce slide/text limits; do not silently invent data, quotes, or citations; use licensed, user-provided, or clearly attributed assets.

## Roadmap
1. MVP: static browser workflow, three directions, outline editing, preview, HTML export.
2. Schema and tests: versioned deck model, unit tests, saved project state, validation report.
3. PPTX renderer: editable text/shapes/images and export smoke tests.
4. AI provider adapter: brief-to-directions and outline-to-deck generation with retries and structured output.
5. Asset pipeline: search, attribution, source tracking, image placement.
6. Autonomous design agent: plan, generate, critique, repair, and deliver with traceable quality checks.