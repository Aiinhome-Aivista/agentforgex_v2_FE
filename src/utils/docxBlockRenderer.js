/**
 * docxBlockRenderer.js
 *
 * Converts the framework-agnostic "blocks" produced by exportSectionsAddon.js
 * into an array of `docx` library elements ready to drop into a Document's
 * `children` array.
 *
 * Pair with docxGenerator.js — see the patch notes at the bottom of this file.
 */

import {
  Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageBreak,
} from "docx";

const HEX = {
  paper:    "FFFFFF",
  ink:      "0F172A",
  inkSoft:  "475569",
  rule:     "E2E8F0",
  surface:  "F8FAFC",
  brand:    "10B981",
  brandDk:  "059669",
  navy:     "1E293B",
  amber:    "B45309",
  blue:     "1D4ED8",
};

const r = (txt, opts = {}) => new TextRun({ text: String(txt ?? ""), ...opts });
const p = (runs, opts = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing: { before: 60, after: 60, ...(opts.spacing || {}) },
    alignment: opts.alignment,
  });

const borders = (color = HEX.rule, size = 2) => ({
  top:    { style: BorderStyle.SINGLE, size, color },
  bottom: { style: BorderStyle.SINGLE, size, color },
  left:   { style: BorderStyle.SINGLE, size, color },
  right:  { style: BorderStyle.SINGLE, size, color },
});

const tableBorders = (color = HEX.rule) => ({
  ...borders(color),
  insideH: { style: BorderStyle.SINGLE, size: 2, color },
  insideV: { style: BorderStyle.SINGLE, size: 2, color },
});

function headerCell(text, bg = HEX.navy, fg = HEX.paper) {
  return new TableCell({
    width: { size: 1, type: WidthType.AUTO },
    shading: { type: "clear", fill: bg },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: borders(),
    children: [p(r(text, { bold: true, color: fg, size: 18 }))],
  });
}

function bodyCell(text) {
  return new TableCell({
    width: { size: 1, type: WidthType.AUTO },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: borders(),
    children: [p(r(text, { color: HEX.ink, size: 18 }))],
  });
}

/* ───────────────────────────────────────────────────────────────────────── */
export function renderBlocksAsDocxChildren(blocks) {
  const out = [];
  if (!Array.isArray(blocks) || blocks.length === 0) return out;

  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;

    if (b.type === "heading") {
      const level = b.level || 1;
      if (level === 1) {
        out.push(p(r(b.text || "", { bold: true, color: HEX.ink, size: 32 }),
                   { spacing: { before: 320, after: 120 } }));
        out.push(new Paragraph({
          children: [r(" ", { size: 1 })],
          border:   {
            bottom: { style: BorderStyle.SINGLE, size: 8, color: HEX.brand },
          },
        }));
      } else if (level === 2) {
        out.push(p(r(b.text || "", { bold: true, color: HEX.brandDk, size: 26 }),
                   { spacing: { before: 220, after: 100 } }));
      } else {
        out.push(p(r(b.text || "", { bold: true, color: HEX.ink, size: 22 }),
                   { spacing: { before: 160, after: 60 } }));
      }
      continue;
    }

    if (b.type === "paragraph") {
      out.push(p(r(b.text || "", { color: HEX.ink, size: 20 }),
                 { spacing: { before: 60, after: 60 } }));
      continue;
    }

    if (b.type === "bullets") {
      (b.items || []).forEach((item) => {
        out.push(new Paragraph({
          children: [r(item, { color: HEX.ink, size: 20 })],
          bullet:   { level: 0 },
          spacing:  { before: 40, after: 40 },
        }));
      });
      continue;
    }

    if (b.type === "kv") {
      const rows = (b.rows || []).map(([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              shading: { type: "clear", fill: HEX.surface },
              borders: borders(),
              children: [p(r(String(k).toUpperCase(),
                            { bold: true, color: HEX.brandDk, size: 16 }))],
            }),
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              borders: borders(),
              children: [p(r(String(v ?? "—"), { color: HEX.ink, size: 18 }))],
            }),
          ],
        }),
      );
      out.push(new Table({
        rows,
        width:   { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(),
      }));
      out.push(p(r(" ", { size: 1 })));
      continue;
    }

    if (b.type === "callout") {
      const fill = b.tone === "warn" ? "FEF3C7" : "DBEAFE";
      const stripe = b.tone === "warn" ? HEX.amber : HEX.blue;
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(stripe),
        rows: [
          new TableRow({
            children: [new TableCell({
              shading: { type: "clear", fill },
              borders: borders(stripe, 4),
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [p(r(b.text || "", { color: HEX.ink, size: 20 }))],
            })],
          }),
        ],
      }));
      out.push(p(r(" ", { size: 1 })));
      continue;
    }

    if (b.type === "table") {
      const headers = b.headers || [];
      const rows = b.rows || [];
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(),
        rows: [
          new TableRow({ tableHeader: true, children: headers.map((h) => headerCell(h)) }),
          ...rows.map((row) => new TableRow({
            children: row.map((cell) => bodyCell(cell)),
          })),
        ],
      }));
      out.push(p(r(" ", { size: 1 })));
      continue;
    }
  }

  return out;
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 *  PATCH NOTES for docxGenerator.js
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ▶ EDIT 1 — imports at the top of docxGenerator.js
 *
 *   Find:
 *       import { layoutWorkflow, hasFlowData, LANE_ACCENTS } from "./workflowRenderer";
 *
 *   ADD this line right after it:
 *       import { buildAddonBlocks }       from "./exportSectionsAddon";
 *       import { renderBlocksAsDocxChildren } from "./docxBlockRenderer";
 *
 *
 * ▶ EDIT 2 — extend allChildren inside generateDOCX()
 *
 *   Find:
 *       const allChildren = [
 *         ...buildCover(data, title),
 *         ...buildTOC(data),
 *         ...buildWorkflowSection(flowData),
 *         ...(data.sections || []).flatMap((s, i) => renderSection(s, i)),
 *       ];
 *
 *   REPLACE with:
 *       const allChildren = [
 *         ...buildCover(data, title),
 *         ...buildTOC(data),
 *         ...buildWorkflowSection(
 *           // Prefer the canonical workflow graph from the technical-design
 *           // payload (guaranteed Start/End nodes per the spec).
 *           (data && data.agentic_workflow_graph) || flowData
 *         ),
 *         ...(data.sections || []).flatMap((s, i) => renderSection(s, i)),
 *         // ─── NEW: addon sections ──────────────────────────────────────
 *         ...renderBlocksAsDocxChildren(buildAddonBlocks(data)),
 *       ];
 *
 *
 * No other edits required.
 */
