# AgentForgeX — Export Refactor (PDF / DOCX / PPTX)

This bundle replaces the existing export pipeline with native-renderer
generators that embed the **real Procure-to-Pay swimlane** (from
`getProcessFlow(id)`) instead of the previous generic
"Input Collection → Data Processing → AI Analysis" pipeline pills, and
fixes every issue flagged in the marked PDF review.

## Files in this bundle

```
src/
├── utils/
│   ├── workflowRenderer.js     NEW — shared swimlane layout engine (mm units)
│   ├── pdfGenerator.js         REWRITTEN — native jsPDF, landscape workflow page
│   ├── docxGenerator.js        REWRITTEN — multi-row swimlane table
│   └── pptxGenerator.js        REWRITTEN — native shapes + arrows
└── components/
    └── pdf/
        └── SuggestionExportPdf.jsx   REWRITTEN — fetches design AND flow
```

Drop these on top of the existing files in your project. No directory
restructuring required, no new dependencies.

## Install

```bash
# from project root
unzip -o AgentForgeX_Export_Optimized.zip
```

The bundle uses only libraries already in `package.json`:

- `jspdf ^4.2.1`
- `docx ^9.6.1`
- `pptxgenjs ^4.0.1`

No `npm install` step is required.

## What changed — workflow is now real

The previous exports drew a hard-coded 3-pill pipeline. They now render
the actual process flow returned by `getProcessFlow(analysisId)` — for
Procure-to-Pay that's 5 swimlanes (Requesting Dept → Procurement →
Warehouse → Quality → Finance) × 12 nodes with the real edges.

- `SuggestionExportPdf.jsx` fetches **both**
  `getTechnicalDesign(suggestionId)` and `getProcessFlow(analysisId)` in
  parallel via `Promise.allSettled`. Flow is optional — if the endpoint
  fails the generators show "Process flow data not available" and the
  rest of the document still renders.
- `workflowRenderer.js` builds a pure-data layout (lane y-positions,
  node x/y, edge paths) in **millimeters**. Each generator scales to its
  own unit system (mm in PDF, twips in DOCX, inches in PPTX).
- **PDF** — workflow is its own landscape A4 page, fit-both scaled,
  L-shape edges with arrowheads, lane tints from the shared palette.
- **DOCX** — multi-row table, one row per lane, columns = global step
  numbers. Lane-tinted backgrounds, accent left borders. A textual
  "Process Flow Sequence" follows for accessibility.
- **PPTX** — native `roundRect` (start/end), `diamond` (decision),
  `rect` with lane-accent bar (process), `line` with triangle
  arrowheads. Lane labels on the left.

## Marked-PDF bugs — all fixed

| # | Issue (from marked PDF) | Fix |
|---|---|---|
| 1 | Duplicate footer on cover page | Single-footer policy; `customFooterPages` Set skips cover & landscape pages in `drawFooters()` |
| 2 | Cover title overflow / "Suggestion Suggestion" concat | Uses `cp.title` verbatim, no suffix concatenation |
| 3 | TOC missing section 7 ("Word Report Generation") | TOC now derived from `sections[]` not `table_of_contents` |
| 4 | Generic pipeline workflow (3 pills) | Real swimlane via shared `workflowRenderer` |
| 5 | Agent cards split across pages | `ensureSpace(cardHeight)` before each card |
| 6 | Tech-stack rows rendered twice | Single-pass render only |
| 7 | Metrics targets clipped | `splitTextToSize` pre-wraps; card height is dynamic |
| 8 | Memory storage label inline with value | Storage label now on its own row |
| 9 | End-to-End workflows too sparse | Description + numbered steps now shown |
| 10 | WebSocket/EDI cards orphaned at page top | `ensureSpace` before each integration card |

## Palette (enterprise / consulting)

- Paper `#FFFFFF`
- Ink `#0F172A`
- Surface `#F8FAFC`
- Navy `#1E293B`
- Emerald accent `#10B981`
- Lane accents: blue, violet, emerald, amber, rose, cyan, indigo

## API contract (unchanged)

`SuggestionExportPdf` expects the existing props:

```js
<SuggestionExportPdf
  suggestionId={...}
  suggestion={{ title, analysisId, ... }}
  processData={{ process: { _key } }}
  disabled={false}
/>
```

`analysisId` resolution order:
`suggestion.analysisId` → `processData.process._key` → `processData.process.id` → `suggestionId`.
