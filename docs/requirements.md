# AI Design Studio — MVP Requirements

## Product intent
Help users turn a rough presentation brief into a coherent, editable deck through a guided design workflow. The product should behave like a design partner, not a one-click generic template generator.

## Primary user journey
1. Enter the presentation title, goal/context, target audience, length, and tone.
2. Review three genuinely different visual directions and select one.
3. Review and edit the proposed slide outline.
4. Preview individual slides and navigate the deck.
5. Export a deliverable and review quality before sharing.

## MVP acceptance criteria
- Edit title, brief, audience, slide count, and tone in the browser.
- Three visual direction cards have distinguishable palettes and visual languages.
- Choosing a direction updates the slide preview.
- Slide titles/body can be edited; slides can be added or deleted and counts/navigation update.
- Previous/next and slide dots navigate the deck.
- HTML export downloads a standalone, printable HTML deck.
- UI clearly discloses that this prototype does not yet call an LLM or generate editable PPTX.
- Responsive layout works without a build step or external dependencies.

## Out of scope for this milestone
Real model/API integration, native editable PPTX export, asset search/licensing checks, factual citations, authentication, cloud persistence, collaboration, and billing.

## Design principles adapted from huashu-design
Understand audience and communication goals before choosing a visual treatment; explore distinct directions before producing a full deck; let content drive layout; prefer purposeful visual evidence over decorative filler; check readability, hierarchy, consistency, and information density before delivery.

The upstream huashu-design repository is MIT-licensed. If source files or substantial text are copied into this project, include the applicable upstream license and attribution. This MVP independently implements similar workflow ideas and does not vendor the upstream skill source.