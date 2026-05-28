/**
 * processPdfGenerator.js — REWRITTEN
 * ────────────────────────────────────────────────────────────────────────────
 * Drives the "EXPORT BLUEPRINT PDF" action on AnalysisPage.
 *
 * The generator NO LONGER builds any blueprint content locally — every
 * paragraph, every bullet, every table comes from the dedicated backend
 * blueprint API:
 *
 *     GET /api/processes/<process_key>/blueprint-export
 *     → { status, data: { cover, sections[], closing, ... } }
 *
 * The render layer is purely a translator from the payload's `blocks`
 * (heading3 / paragraph / bullets / table) to jsPDF primitives.  The result
 * matches the reference AgentForge_P2P_Agentic_Blueprint.docx in layout,
 * section order, headings, tables, styling, and formatting — while every
 * content string remains 100% dynamic.
 *
 * Public entry point:
 *     generateProcessPDF(data)
 *       - data: the analysis payload already in memory on the page.
 *               We use data.process._key / data.process.id to call the API.
 */

import jsPDF from "jspdf";
import { getProcessBlueprint, getSuggestionBlueprint } from "../services/api";

/* ─── Palette (matches the reference brand styling) ────────────────────── */
const C = {
  navy: [15, 23, 42],
  ink: [30, 41, 59],
  inkSoft: [71, 85, 105],
  gray1: [51, 65, 85],
  gray2: [100, 116, 139],
  gray3: [148, 163, 184],
  border: [226, 232, 240],
  surface: [248, 250, 252],
  brand: [16, 185, 129],       // emerald
  brandDk: [5, 150, 105],
  amber: [180, 83, 9],
  red: [220, 38, 38],
};

/* ─── A4 portrait constants ─────────────────────────────────────────────── */
const PW = 210, PH = 297;
const ML = 18, MR = 18, MTop = 22, MBot = 18;
const CW = PW - ML - MR;
const LINE_H_BODY = 5.2;
const LINE_H_TIGHT = 4.6;

/* ─── Drawing helpers ──────────────────────────────────────────────────── */
const fill = (d, c) => d.setFillColor(...c);
const stroke = (d, c) => d.setDrawColor(...c);
const ink = (d, c) => d.setTextColor(...c);
const setFont = (d, weight = "normal", size = 10) => {
  d.setFontSize(size);
  d.setFont("helvetica", weight);
};
const drawText = (d, s, x, y, opts) => {
  if (s == null) return;
  const clean = String(s).replace(/→/g, "->");
  d.text(clean, x, y, opts);
};

function pageBreakIfNeeded(d, y, needed, redrawHeader) {
  if (y + needed <= PH - MBot - 4) return y;
  d.addPage("a4", "portrait");
  if (typeof redrawHeader === "function") redrawHeader(d);
  return MTop;
}

function drawWrap(d, str, x, y, maxW, {
  size = 10, color = C.ink, weight = "normal", lineH = LINE_H_BODY,
} = {}) {
  setFont(d, weight, size);
  ink(d, color);
  const clean = String(str ?? "").replace(/→/g, "->");
  const lines = d.splitTextToSize(clean, maxW);
  lines.forEach((ln, i) => drawText(d, ln, x, y + i * lineH));
  return y + lines.length * lineH;
}

function unwrap(resp) {
  if (!resp) return resp;
  if (resp.data !== undefined && (resp.status !== undefined || resp.config !== undefined)) {
    return resp.data;
  }
  return resp;
}

/* ─── Cover page ───────────────────────────────────────────────────────── */
function drawCover(d, cover) {
  fill(d, C.navy);
  d.rect(0, 0, PW, PH, "F");
  fill(d, C.brand);
  d.rect(0, 0, PW, 4, "F");

  // Top brand
  setFont(d, "bold", 9);
  ink(d, C.brand);
  drawText(d, cover.brand_top || "AGENTFORGE", ML, 22);
  setFont(d, "normal", 8);
  ink(d, [148, 163, 184]);
  drawText(d, cover.brand_subtitle || "EXECUTION LAYER OF THE ENTERPRISE", ML, 27);

  // Title block
  fill(d, C.brand);
  d.rect(ML, 90, 50, 1.5, "F");

  setFont(d, "bold", 26);
  ink(d, [255, 255, 255]);
  const cleanTitle = String(cover.title || "Process Agentification Blueprint").replace(/→/g, "->");
  const titleLines = d.splitTextToSize(cleanTitle, CW);
  titleLines.forEach((ln, i) => drawText(d, ln, ML, 105 + i * 11));

  let y = 105 + titleLines.length * 11 + 6;
  setFont(d, "normal", 14);
  ink(d, [203, 213, 225]);
  drawText(d, cover.subtitle || "Process Agentification Blueprint", ML, y);
  y += 10;

  if (cover.tagline) {
    setFont(d, "italic", 11);
    ink(d, [148, 163, 184]);
    const cleanTag = String(cover.tagline).replace(/→/g, "->");
    const tagLines = d.splitTextToSize(cleanTag, CW);
    tagLines.forEach((ln, i) => drawText(d, ln, ML, y + i * 6));
    y += tagLines.length * 6 + 4;
  }

  // Lower deliverable + footer
  fill(d, C.brand);
  d.rect(ML, PH - 56, 50, 1.5, "F");
  setFont(d, "normal", 8);
  ink(d, C.brand);
  drawText(d, (cover.deliverable_label || "Engagement deliverable").toUpperCase(), ML, PH - 50);

  setFont(d, "normal", 9);
  ink(d, [203, 213, 225]);
  drawText(d, cover.footer_line || "", ML, PH - 42);

  setFont(d, "normal", 8);
  ink(d, [148, 163, 184]);
  drawText(d, "Confidential", ML, PH - 8);
  drawText(d, "Draft V1.0", PW - MR, PH - 8, { align: "right" });
}

/* ─── Section header (start of a new §X) ───────────────────────────────── */
function drawSectionHeader(d, sectionNumber, sectionTitle) {
  d.addPage("a4", "portrait");
  // Top accent band
  fill(d, C.surface);
  d.rect(0, 0, PW, 14, "F");
  stroke(d, C.brand);
  d.setLineWidth(0.6);
  d.line(ML, 14, PW - MR, 14);

  setFont(d, "bold", 9);
  ink(d, C.brand);
  drawText(d, "AGENTFORGEX  •  PROCESS AGENTIFICATION BLUEPRINT", ML, 9);

  // §N badge
  fill(d, C.brand);
  d.roundedRect(ML, MTop, 18, 9, 1.5, 1.5, "F");
  setFont(d, "bold", 10);
  ink(d, [255, 255, 255]);
  drawText(d, `${sectionNumber}`, ML + 9, MTop + 6.5, { align: "center" });

  setFont(d, "bold", 18);
  ink(d, C.navy);

  const maxW = PW - MR - (ML + 24); // 210 - 18 - 42 = 150
  const cleanTitle = String(sectionTitle ?? "").replace(/→/g, "->");
  const titleLines = d.splitTextToSize(cleanTitle, maxW);
  const titleLineHeight = 7.5;
  titleLines.forEach((ln, i) => {
    drawText(d, ln, ML + 24, MTop + 6.5 + i * titleLineHeight);
  });

  const headerBottom = MTop + 6.5 + (titleLines.length - 1) * titleLineHeight + 6.5;

  // Accent rule
  stroke(d, C.brand);
  d.setLineWidth(0.5);
  d.line(ML, headerBottom, PW - MR, headerBottom);

  return headerBottom + 6;
}

/* ─── Block renderers ──────────────────────────────────────────────────── */
function renderHeading3(d, y, block, redrawHeader) {
  y = pageBreakIfNeeded(d, y, 12, redrawHeader);
  setFont(d, "bold", 12);
  ink(d, C.brandDk);
  drawText(d, block.text || "", ML, y + 5);
  // Light underline
  stroke(d, C.brand);
  d.setLineWidth(0.25);
  d.line(ML, y + 7.5, ML + 22, y + 7.5);
  return y + 11;
}

function renderParagraph(d, y, block, redrawHeader) {
  y = pageBreakIfNeeded(d, y, 8, redrawHeader);
  // Support inline **bold** by rendering segments
  const text = String(block.text || "");
  if (!text.includes("**")) {
    return drawWrap(d, text, ML, y, CW, { size: 10, color: C.ink, lineH: LINE_H_BODY }) + 3;
  }
  // Mixed bold/normal — split & render line by line in jsPDF.
  // We approximate by rendering the whole paragraph in normal weight; bold
  // markers are stripped so output remains clean.
  const stripped = text.replace(/\*\*(.*?)\*\*/g, "$1");
  return drawWrap(d, stripped, ML, y, CW, { size: 10, color: C.ink, lineH: LINE_H_BODY }) + 3;
}

function renderBullets(d, y, block, redrawHeader) {
  const items = block.items || [];
  for (const item of items) {
    y = pageBreakIfNeeded(d, y, 8, redrawHeader);
    fill(d, C.brand);
    d.circle(ML + 2, y - 1, 0.9, "F");
    y = drawWrap(d, item, ML + 7, y, CW - 7, {
      size: 9.8, color: C.ink, lineH: LINE_H_TIGHT,
    }) + 1.2;
  }
  return y + 2;
}

function renderTable(d, y, block, redrawHeader) {
  const headers = block.headers || [];
  const rows = block.rows || [];
  if (headers.length === 0) return y;

  const nCols = headers.length;
  // Distribute columns slightly weighted to the last column (description-ish)
  const baseW = CW / nCols;
  const colW = headers.map(() => baseW);

  const headerH = 9;
  y = pageBreakIfNeeded(d, y, headerH + 12, redrawHeader);

  // Header row
  fill(d, C.navy);
  d.rect(ML, y, CW, headerH, "F");
  setFont(d, "bold", 8.5);
  ink(d, [255, 255, 255]);
  let cx = ML;
  headers.forEach((h, i) => {
    drawText(d, String(h), cx + 2.5, y + 6);
    cx += colW[i];
  });
  y += headerH;

  // Body rows
  rows.forEach((row, ri) => {
    // Pre-wrap each cell and find tallest
    let maxLines = 1;
    const wrapped = row.map((cell, i) => {
      setFont(d, "normal", 8.8);
      const clean = String(cell ?? "").replace(/→/g, "->");
      const lines = d.splitTextToSize(clean, colW[i] - 5);
      if (lines.length > maxLines) maxLines = lines.length;
      return lines;
    });
    const rowH = Math.max(7, maxLines * 4.4 + 3);
    y = pageBreakIfNeeded(d, y, rowH + 1, redrawHeader);

    if (ri % 2 === 0) {
      fill(d, C.surface);
      d.rect(ML, y, CW, rowH, "F");
    }
    setFont(d, "normal", 8.8);
    ink(d, C.ink);
    cx = ML;
    wrapped.forEach((lines, i) => {
      lines.forEach((ln, li) => drawText(d, ln, cx + 2.5, y + 5 + li * 4.4));
      cx += colW[i];
    });
    // Bottom border
    stroke(d, C.border);
    d.setLineWidth(0.1);
    d.line(ML, y + rowH, PW - MR, y + rowH);
    y += rowH;
  });
  return y + 5;
}

const RENDERERS = {
  heading3: renderHeading3,
  paragraph: renderParagraph,
  bullets: renderBullets,
  table: renderTable,
};

/* ─── Section render ───────────────────────────────────────────────────── */
function renderSection(d, section) {
  const number = section.number != null ? section.number : "";
  const title = section.title || "";
  let y = drawSectionHeader(d, number, `${number ? `${number} — ` : ""}${title}`);
  const redraw = () => {
    fill(d, C.surface);
    d.rect(0, 0, PW, 14, "F");
    stroke(d, C.brand);
    d.setLineWidth(0.6);
    d.line(ML, 14, PW - MR, 14);
    setFont(d, "bold", 9);
    ink(d, C.brand);
    drawText(d, "AGENTFORGEX  •  PROCESS AGENTIFICATION BLUEPRINT", ML, 9);
  };

  // Optional lead paragraph (italicised)
  if (section.lead) {
    y = pageBreakIfNeeded(d, y, 10, redraw);
    y = drawWrap(d, section.lead, ML, y, CW, {
      size: 10.5, weight: "italic", color: C.inkSoft, lineH: LINE_H_BODY,
    }) + 4;
  }

  // Blocks
  for (const block of (section.blocks || [])) {
    const fn = RENDERERS[block?.type];
    if (fn) y = fn(d, y, block, redraw);
  }
}

/* ─── Closing ──────────────────────────────────────────────────────────── */
function renderClosing(d, closing) {
  if (!closing) return;
  let y = drawSectionHeader(d, "", closing.title || "Closing");
  const redraw = () => { /* matches drawSectionHeader's banner */
    fill(d, C.surface);
    d.rect(0, 0, PW, 14, "F");
    stroke(d, C.brand);
    d.setLineWidth(0.6);
    d.line(ML, 14, PW - MR, 14);
    setFont(d, "bold", 9);
    ink(d, C.brand);
    drawText(d, "AGENTFORGEX  •  PROCESS AGENTIFICATION BLUEPRINT", ML, 9);
  };
  for (const block of (closing.blocks || [])) {
    const fn = RENDERERS[block?.type];
    if (fn) y = fn(d, y, block, redraw);
  }
}

/* ─── Footer (page numbers + brand line) ───────────────────────────────── */
function drawFooter(d) {
  const total = d.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    d.setPage(i);
    stroke(d, C.border);
    d.setLineWidth(0.2);
    d.line(ML, PH - 14, PW - MR, PH - 14);
    setFont(d, "normal", 8);
    ink(d, C.gray2);
    drawText(d, "AgentForge · Confidential", ML, PH - 8);
    drawText(d, `${i} / ${total}`, PW - MR, PH - 8, { align: "right" });
  }
}

/* ─── Public entry point ───────────────────────────────────────────────── */
export async function generateProcessPDF(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessPDF: invalid analysis payload");
  }
  const processKey = data.process._key || data.process.id;
  if (!processKey) throw new Error("generateProcessPDF: process_key missing");

  // ── Fetch the dynamic blueprint payload ──────────────────────────────
  const resp = await getProcessBlueprint(processKey);
  const env = unwrap(resp);
  if (env && env.status === false) {
    throw new Error(env.message || "Blueprint API failed to generate payload.");
  }
  const payload = env?.data || env;
  if (!payload || !payload.cover || !Array.isArray(payload.sections)) {
    throw new Error("Blueprint API returned an invalid payload.");
  }

  const d = new jsPDF("portrait", "mm", "a4");

  // Cover
  drawCover(d, payload.cover);

  // Sections §0 .. §N
  for (const sec of payload.sections) {
    renderSection(d, sec);
  }

  // Closing
  if (payload.closing) {
    renderClosing(d, payload.closing);
  }

  // Footer pass
  drawFooter(d);

  const fname = `${(payload.cover.title || "Process").replace(/[^a-z0-9_-]+/gi, "_")}_Blueprint.pdf`;
  d.save(fname);
}

/* ─── NEW: suggestion-focused blueprint PDF (Scenario 2) ──────────────── */
/**
 * Drives the "EXPORT BLUEPRINT PDF" action on the suggestion detail page.
 *
 * Same rendering pipeline as generateProcessPDF, but fetches from the new
 * suggestion-level endpoint:
 *
 *     GET /api/suggestions/<suggestion_id>/blueprint-export
 *
 * The payload shape is identical, so the same drawCover / renderSection /
 * renderClosing functions render it.  Content is focused on the chosen
 * suggestion's anchor step (the one with higher agentic intervention).
 *
 * Public entry point: generateSuggestionBlueprintPDF(suggestionId)
 */
export async function generateSuggestionBlueprintPDF(suggestionId) {
  if (!suggestionId) throw new Error("generateSuggestionBlueprintPDF: suggestion id missing");

  const resp = await getSuggestionBlueprint(suggestionId);
  const env = unwrap(resp);
  if (env && env.status === false) {
    throw new Error(env.message || "Suggestion blueprint API failed to generate payload.");
  }
  const payload = env?.data || env;
  if (!payload || !payload.cover || !Array.isArray(payload.sections)) {
    throw new Error("Suggestion blueprint API returned an invalid payload.");
  }

  const d = new jsPDF("portrait", "mm", "a4");

  drawCover(d, payload.cover);
  for (const sec of payload.sections) renderSection(d, sec);
  if (payload.closing) renderClosing(d, payload.closing);
  drawFooter(d);

  const safeTitle = (payload.cover.title || "Suggestion")
    .replace(/[^a-z0-9_-]+/gi, "_");
  d.save(`${safeTitle}_Suggestion_Blueprint.pdf`);
}

