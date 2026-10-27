# AI Design Studio

An AI-assisted design workspace for creating presentation decks and web experiences from a brief. The product follows a deliberate workflow: clarify the brief, compare three distinct visual directions, shape the narrative, edit a structured deck, preview slides, and export deliverables.

## Product goals

- Turn a natural-language brief into a presentation plan and slide outline.
- Require a choice among three meaningfully different visual directions before generating a full deck.
- Keep structured deck data as the source of truth so previews and exports stay aligned.
- Provide an editable slide preview with per-slide content editing and regeneration hooks.
- Validate readability, content density, and missing content before delivery.

## MVP

The first milestone is a browser-based prototype with a brief form, three visual direction cards, an editable outline, a live HTML slide preview, and a downloadable HTML deck. PowerPoint export and provider-backed AI generation are follow-up milestones; the prototype must not imply those are implemented until they are.

## Design method

The project adapts workflow concepts from [huashu-design](https://github.com/alchaincyf/huashu-design): research context first, explore distinct visual directions, make content drive layout, prefer real visual assets over decorative filler, and run a quality pass before delivery. The upstream project is licensed under MIT; this repository should preserve attribution and include the applicable license if source files or substantial text are vendored.

## Planned architecture

- `apps/web`: design studio UI and slide preview.
- `packages/deck-schema`: typed deck/slide data model and validation.
- `docs`: requirements, architecture, and design workflow notes.

## Status

Project bootstrap. Features described as planned are not yet implemented. See `docs/requirements.md` and `docs/architecture.md` as they are added.