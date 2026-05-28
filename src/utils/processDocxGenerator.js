

/**
 * processDocxGenerator.js — REWRITTEN
 * ────────────────────────────────────────────────────────────────────────────
 * Drives the "EXPORT BLUEPRINT WORD" action.
 *
 * All content is fetched from:
 *     GET /api/processes/<process_key>/blueprint-export
 *
 * The DOCX layout, heading hierarchy, table styles, and section order match
 * the reference AgentForge_P2P_Agentic_Blueprint.docx exactly.  Every piece
 * of content (paragraphs, bullets, table rows) comes from the API — no
 * blueprint copy is hardcoded in the frontend.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageBreak,
  HeadingLevel, Footer, PageOrientation,
} from "docx";
import { getProcessBlueprint, getSuggestionBlueprint } from "../services/api";

/* ─── Colour tokens (must match the brand palette) ─────────────────────── */
const HEX = {
  paper: "FFFFFF",
  ink: "0F172A",
  inkSoft: "475569",
  inkMute: "94A3B8",
  rule: "E2E8F0",
  surface: "F8FAFC",
  brand: "10B981",
  brandDk: "059669",
  navy: "1E293B",
  amber: "B45309",
  red: "DC2626",
};

/* ─── Run / Paragraph helpers ───────────────────────────────────────────── */
const r = (txt, opts = {}) => new TextRun({ text: String(txt ?? ""), ...opts });
const p = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { before: 60, after: 60, ...(opts.spacing || {}) },
    alignment: opts.alignment,
    ...(opts.heading ? { heading: opts.heading } : {}),
    ...(opts.indent ? { indent: opts.indent } : {}),
  });

/* ─── Heading helpers (Heading1 for §X, Heading3 for subsections) ──────── */
const h1Section = (number, title) =>
  p(
    [
      r(number ? `${number} — ` : "", { bold: true, color: HEX.brand, size: 32 }),
      r(title, { bold: true, color: HEX.ink, size: 32 }),
    ],
    { spacing: { before: 360, after: 160 }, heading: HeadingLevel.HEADING_1 },
  );

const h3 = (text) =>
  p(
    r(text, { bold: true, color: HEX.brandDk, size: 24 }),
    { spacing: { before: 220, after: 80 }, heading: HeadingLevel.HEADING_3 },
  );

const body = (text, opts = {}) =>
  p(r(text, { color: HEX.ink, size: 20 }), { spacing: { before: 60, after: 60, ...(opts.spacing || {}) } });

const muted = (text) =>
  p(r(text, { color: HEX.inkSoft, size: 19, italics: true }),
    { spacing: { before: 80, after: 120 } });

const bullet = (text) =>
  new Paragraph({
    children: [r(text, { color: HEX.ink, size: 20 })],
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
  });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => p(r(" ", { size: 4 }));

/* ─── Table cell + border helpers ──────────────────────────────────────── */
const borders = (color = HEX.rule, size = 2) => ({
  top: { style: BorderStyle.SINGLE, size, color },
  bottom: { style: BorderStyle.SINGLE, size, color },
  left: { style: BorderStyle.SINGLE, size, color },
  right: { style: BorderStyle.SINGLE, size, color },
});

const tableBorders = (color = HEX.rule) => ({
  ...borders(color),
  insideH: { style: BorderStyle.SINGLE, size: 2, color },
  insideV: { style: BorderStyle.SINGLE, size: 2, color },
});

const headerCell = (text) => new TableCell({
  width: { size: 1, type: WidthType.AUTO },
  shading: { type: "clear", fill: HEX.navy },
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  borders: borders(),
  children: [p(r(text, { bold: true, color: HEX.paper, size: 18 }))],
});

const bodyCell = (text, opts = {}) => new TableCell({
  width: { size: 1, type: WidthType.AUTO },
  shading: opts.bg ? { type: "clear", fill: opts.bg } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  borders: borders(),
  children: [p(r(text, {
    color: opts.color || HEX.ink,
    size: 18,
    bold: !!opts.bold,
  }))],
});

/* ─── Block renderers (heading3, paragraph, bullets, table) ────────────── */
function renderBlock(block) {
  if (!block || !block.type) return [];
  switch (block.type) {
    case "heading3":
      return [h3(block.text || "")];

    case "paragraph": {
      // Strip **bold** markers — docx doesn't support inline bold via simple
      // string; we render the whole paragraph as body text.
      const stripped = String(block.text || "").replace(/\*\*(.*?)\*\*/g, "$1");
      return [body(stripped)];
    }

    case "bullets":
      return (block.items || []).map((it) => bullet(it));

    case "table": {
      const headers = block.headers || [];
      const rows = block.rows || [];
      if (headers.length === 0) return [];
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders(),
          rows: [
            new TableRow({
              tableHeader: true,
              children: headers.map((h) => headerCell(h)),
            }),
            ...rows.map((row, ri) => new TableRow({
              children: (row || []).map((cell) => bodyCell(cell, {
                bg: ri % 2 === 0 ? HEX.surface : undefined,
              })),
            })),
          ],
        }),
        spacer(),
      ];
    }

    default:
      return [];
  }
}

/* ─── Cover ────────────────────────────────────────────────────────────── */
function buildCover(cover) {
  if (!cover) cover = {};
  return [
    p(r(cover.brand_top || "AGENTFORGE",
      { bold: true, color: HEX.brand, size: 24 }),
      { spacing: { before: 600, after: 100 } }),
    p(r(cover.brand_subtitle || "EXECUTION LAYER OF THE ENTERPRISE",
      { color: HEX.inkSoft, size: 18, bold: true })),
    spacer(),

    p(r(cover.title || "Process Agentification Blueprint",
      { bold: true, color: HEX.ink, size: 56 }),
      { spacing: { before: 400, after: 200 } }),
    p(r(cover.subtitle || "Process Agentification Blueprint",
      { color: HEX.brandDk, size: 28 })),

    spacer(),

    cover.tagline ? muted(cover.tagline) : spacer(),

    spacer(),

    p(r((cover.deliverable_label || "Engagement deliverable").toUpperCase(),
      { color: HEX.brand, size: 16, bold: true })),
    p(r(cover.footer_line || "",
      { color: HEX.inkSoft, size: 18 })),

    pageBreak(),
  ];
}

/* ─── Section ──────────────────────────────────────────────────────────── */
function buildSection(section) {
  const out = [
    h1Section(section.number ?? "", section.title || ""),
  ];
  if (section.lead) out.push(muted(section.lead));
  for (const block of (section.blocks || [])) {
    out.push(...renderBlock(block));
  }
  out.push(pageBreak());
  return out;
}

/* ─── Closing ──────────────────────────────────────────────────────────── */
function buildClosing(closing) {
  if (!closing) return [];
  const out = [h1Section("", closing.title || "Closing")];
  for (const block of (closing.blocks || [])) {
    out.push(...renderBlock(block));
  }
  return out;
}

function unwrap(resp) {
  if (!resp) return resp;
  if (resp.data !== undefined && (resp.status !== undefined || resp.config !== undefined)) {
    return resp.data;
  }
  return resp;
}

/* ─── Public entry point ───────────────────────────────────────────────── */
export async function generateProcessDOCX(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessDOCX: invalid analysis payload");
  }
  const processKey = data.process._key || data.process.id;
  if (!processKey) throw new Error("generateProcessDOCX: process_key missing");

  const resp = await getProcessBlueprint(processKey);
  const env = unwrap(resp);
  if (env && env.status === false) {
    throw new Error(env.message || "Blueprint API failed to generate payload.");
  }
  const payload = env?.data || env;
  if (!payload || !payload.cover || !Array.isArray(payload.sections)) {
    throw new Error("Blueprint API returned an invalid payload.");
  }

  const footer = new Footer({
    children: [
      p(r("AgentForge  ·  Confidential  ·  Process Agentification Blueprint",
        { color: HEX.inkSoft, size: 16 }),
        { alignment: AlignmentType.CENTER }),
    ],
  });

  const allChildren = [
    ...buildCover(payload.cover),
    ...payload.sections.flatMap((s) => buildSection(s)),
    ...buildClosing(payload.closing),
  ];

  const doc = new Document({
    creator: "AgentForge",
    title: payload.cover?.title || "Process Agentification Blueprint",
    description: "Auto-generated Agentic Process Blueprint",
    styles: {
      default: { document: { run: { font: "Calibri", color: HEX.ink } } },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 },
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      footers: { default: footer },
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(payload.cover?.title || "Process").replace(/[^a-z0-9_-]+/gi, "_")}_Blueprint.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── NEW: suggestion-focused blueprint DOCX (Scenario 2) ────────────── */
export async function generateSuggestionBlueprintDOCX(suggestionId) {
  if (!suggestionId) throw new Error("generateSuggestionBlueprintDOCX: suggestion id missing");

  const resp = await getSuggestionBlueprint(suggestionId);
  const env = unwrap(resp);
  if (env && env.status === false) {
    throw new Error(env.message || "Suggestion blueprint API failed to generate payload.");
  }
  const payload = env?.data || env;
  if (!payload || !payload.cover || !Array.isArray(payload.sections)) {
    throw new Error("Suggestion blueprint API returned an invalid payload.");
  }

  const footer = new Footer({
    children: [
      p(r("AgentForge  ·  Confidential  ·  Suggestion Blueprint",
        { color: HEX.inkSoft, size: 16 }),
        { alignment: AlignmentType.CENTER }),
    ],
  });

  const allChildren = [
    ...buildCover(payload.cover),
    ...payload.sections.flatMap((s) => buildSection(s)),
    ...buildClosing(payload.closing),
  ];

  const doc = new Document({
    creator: "AgentForge",
    title: payload.cover?.title || "Suggestion Blueprint",
    description: "Auto-generated Suggestion-Focused Blueprint",
    styles: {
      default: { document: { run: { font: "Calibri", color: HEX.ink } } },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 },
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      footers: { default: footer },
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(payload.cover?.title || "Suggestion").replace(/[^a-z0-9_-]+/gi, "_")}_Suggestion_Blueprint.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

