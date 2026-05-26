/**
 * processPptxGenerator.js — REWRITTEN
 * ────────────────────────────────────────────────────────────────────────────
 * Drives the "EXPORT BLUEPRINT PPT" action.
 *
 * All content is fetched from:
 *     GET /api/processes/<process_key>/blueprint-export
 *
 * Each section opens on its own slide (or several if its blocks overflow).
 * Tables, bullets, paragraphs, and h3 headings are rendered in the same
 * order they appear in the API payload — guaranteeing the deck mirrors the
 * reference AgentForge_P2P_Agentic_Blueprint.docx structure.
 */

import pptxgen from "pptxgenjs";
import { getProcessBlueprint } from "../services/api";

/* ─── Palette ──────────────────────────────────────────────────────────── */
const T = {
  paper:   "FFFFFF",
  ink:     "0F172A",
  inkSoft: "475569",
  inkMute: "94A3B8",
  rule:    "E2E8F0",
  surface: "F8FAFC",
  brand:   "10B981",
  brandDk: "059669",
  navy:    "1E293B",
  amber:   "B45309",
};

const SLIDE_W = 10;
const SLIDE_H = 7.5;
const MX  = 0.5;
const TOP = 0.4;
const BOTTOM_Y = 7.0;

function unwrap(resp) {
  if (!resp) return resp;
  if (resp.data !== undefined && (resp.status !== undefined || resp.config !== undefined)) {
    return resp.data;
  }
  return resp;
}

function approxLines(text, charsPerLine = 95) {
  if (!text) return 1;
  return Math.max(1, Math.ceil(String(text).length / charsPerLine));
}

/* ─── Cover slide ──────────────────────────────────────────────────────── */
function addCover(pptx, cover) {
  const slide = pptx.addSlide({ masterName: "MASTER" });
  slide.background = { color: T.navy };

  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.08, fill: { color: T.brand } });

  slide.addText(cover.brand_top || "AGENTFORGE", {
    x: 0.5, y: 0.55, w: 6, h: 0.4,
    fontSize: 12, bold: true, color: T.brand, fontFace: "Calibri",
  });
  slide.addText(cover.brand_subtitle || "EXECUTION LAYER OF THE ENTERPRISE", {
    x: 0.5, y: 0.95, w: 7, h: 0.3,
    fontSize: 10, color: "94A3B8", fontFace: "Calibri",
  });

  slide.addShape("line", {
    x: 0.5, y: 2.1, w: 1.4, h: 0,
    line: { color: T.brand, width: 2 },
  });
  slide.addText(cover.title || "Process Agentification Blueprint", {
    x: 0.5, y: 2.3, w: SLIDE_W - 1, h: 1.6,
    fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  slide.addText(cover.subtitle || "Process Agentification Blueprint", {
    x: 0.5, y: 4.0, w: SLIDE_W - 1, h: 0.5,
    fontSize: 18, color: "CBD5E1", fontFace: "Calibri",
  });

  if (cover.tagline) {
    slide.addText(cover.tagline, {
      x: 0.5, y: 4.7, w: SLIDE_W - 1, h: 1.0,
      fontSize: 12, italic: true, color: "94A3B8", fontFace: "Calibri", valign: "top",
    });
  }

  // Bottom strip — deliverable label + footer line
  slide.addShape("line", { x: 0.5, y: 6.4, w: 1.0, h: 0, line: { color: T.brand, width: 1.5 } });
  slide.addText((cover.deliverable_label || "Engagement deliverable").toUpperCase(), {
    x: 0.5, y: 6.5, w: 6, h: 0.3,
    fontSize: 9, bold: true, color: T.brand, fontFace: "Calibri",
  });
  slide.addText(cover.footer_line || "", {
    x: 0.5, y: 6.8, w: SLIDE_W - 1, h: 0.3,
    fontSize: 10, color: "CBD5E1", fontFace: "Calibri",
  });
}

/* ─── Section title slide ──────────────────────────────────────────────── */
function startSection(pptx, number, title, lead) {
  const slide = pptx.addSlide({ masterName: "MASTER" });

  // §N badge
  slide.addShape("rect", {
    x: MX, y: TOP, w: 0.65, h: 0.65,
    fill: { color: T.brand }, line: { color: T.brand },
  });
  slide.addText(number ? `${number}` : "", {
    x: MX, y: TOP, w: 0.65, h: 0.65,
    fontSize: 14, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", fontFace: "Calibri",
  });
  slide.addText(title || "", {
    x: MX + 0.8, y: TOP, w: SLIDE_W - MX * 2 - 0.8, h: 1.0,
    fontSize: 20, bold: true, color: T.ink, fontFace: "Calibri", valign: "middle",
  });
  slide.addShape("line", {
    x: MX, y: TOP + 1.05, w: SLIDE_W - MX * 2, h: 0,
    line: { color: T.brand, width: 1 },
  });

  let cursor = 1.5;
  if (lead) {
    const lines = approxLines(lead, 100);
    const h = Math.min(2.5, lines * 0.25 + 0.2);
    slide.addText(lead, {
      x: MX, y: cursor, w: SLIDE_W - MX * 2, h,
      fontSize: 12, italic: true, color: T.inkSoft, fontFace: "Calibri", valign: "top",
    });
    cursor += h + 0.1;
  }
  return { slide, cursor };
}

/* ─── Continuation slide ───────────────────────────────────────────────── */
function continuationSlide(pptx, title) {
  const slide = pptx.addSlide({ masterName: "MASTER" });
  slide.addText(`${title} (cont.)`, {
    x: MX, y: TOP, w: SLIDE_W - MX * 2, h: 0.5,
    fontSize: 18, bold: true, color: T.ink, fontFace: "Calibri",
  });
  slide.addShape("line", {
    x: MX, y: TOP + 0.55, w: SLIDE_W - MX * 2, h: 0,
    line: { color: T.brand, width: 1 },
  });
  return { slide, cursor: 1.1 };
}

/* ─── Block renderers (in-place on the current slide) ──────────────────── */
function renderHeading3(slide, cursor, block) {
  const h = 0.4;
  slide.addText(block.text || "", {
    x: MX, y: cursor, w: SLIDE_W - MX * 2, h,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  return cursor + h + 0.05;
}

function renderParagraph(slide, cursor, block) {
  const text = String(block.text || "").replace(/\*\*(.*?)\*\*/g, "$1");
  const lines = approxLines(text, 95);
  const h = Math.max(0.3, lines * 0.22 + 0.08);
  slide.addText(text, {
    x: MX, y: cursor, w: SLIDE_W - MX * 2, h,
    fontSize: 11, color: T.ink, fontFace: "Calibri", valign: "top",
  });
  return cursor + h + 0.05;
}

function renderBullets(slide, cursor, block) {
  const items = block.items || [];
  const linesEst = items.reduce((acc, it) => acc + approxLines(it, 90), 0);
  const h = Math.max(0.3, linesEst * 0.22 + items.length * 0.06);
  slide.addText(items.map((it) => ({ text: it, options: { bullet: true } })), {
    x: MX + 0.1, y: cursor, w: SLIDE_W - MX * 2 - 0.1, h,
    fontSize: 11, color: T.ink, fontFace: "Calibri",
    paraSpaceAfter: 4, valign: "top",
  });
  return cursor + h + 0.05;
}

function renderTable(slide, cursor, block) {
  const headers = block.headers || [];
  const rows    = block.rows || [];
  if (headers.length === 0) return cursor;

  const headerRow = headers.map((h) => ({
    text: String(h),
    options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9 },
  }));
  const bodyRows = rows.map((row, ri) => row.map((cell) => ({
    text: String(cell ?? ""),
    options: {
      color: T.ink,
      fontSize: 9,
      fill: ri % 2 === 0 ? { color: T.surface } : undefined,
    },
  })));

  const totalW = SLIDE_W - MX * 2;
  const colW = Array(headers.length).fill(totalW / headers.length);
  const rowH = 0.34;
  const tableH = (bodyRows.length + 1) * rowH;

  slide.addTable([headerRow, ...bodyRows], {
    x: MX, y: cursor, w: totalW, colW, rowH,
    border: { type: "solid", pt: 0.5, color: T.rule },
    fontFace: "Calibri",
  });

  return cursor + tableH + 0.15;
}

const SLIDE_RENDERERS = {
  heading3:  renderHeading3,
  paragraph: renderParagraph,
  bullets:   renderBullets,
  table:     renderTable,
};

/* ─── Section paginator: lays out blocks, opens continuation slides as
       needed when cursor would overflow ───────────────────────────────── */
function renderSection(pptx, section) {
  const sectionTitle = `${section.number != null ? `${section.number} — ` : ""}${section.title || ""}`;
  let { slide, cursor } = startSection(pptx, section.number, section.title, section.lead);

  for (const block of (section.blocks || [])) {
    const fn = SLIDE_RENDERERS[block?.type];
    if (!fn) continue;

    // Estimate the block's needed height to decide whether to page-break
    let need = 0.4;
    if (block.type === "paragraph") {
      need = approxLines(block.text, 95) * 0.22 + 0.15;
    } else if (block.type === "bullets") {
      const items = block.items || [];
      need = items.reduce((acc, it) => acc + approxLines(it, 90), 0) * 0.22 + items.length * 0.06;
    } else if (block.type === "table") {
      need = ((block.rows || []).length + 1) * 0.34 + 0.2;
    }

    if (cursor + need > BOTTOM_Y) {
      const ct = continuationSlide(pptx, sectionTitle);
      slide  = ct.slide;
      cursor = ct.cursor;
    }
    cursor = fn(slide, cursor, block);
  }
}

/* ─── Closing ──────────────────────────────────────────────────────────── */
function renderClosing(pptx, closing) {
  if (!closing) return;
  let { slide, cursor } = startSection(pptx, "", closing.title || "Closing", null);
  const sectionTitle = closing.title || "Closing";
  for (const block of (closing.blocks || [])) {
    const fn = SLIDE_RENDERERS[block?.type];
    if (!fn) continue;
    let need = 0.4;
    if (block.type === "paragraph") need = approxLines(block.text, 95) * 0.22 + 0.15;
    if (cursor + need > BOTTOM_Y) {
      const ct = continuationSlide(pptx, sectionTitle);
      slide  = ct.slide;
      cursor = ct.cursor;
    }
    cursor = fn(slide, cursor, block);
  }
}

/* ─── Footer pass (page numbers + brand line) ──────────────────────────── */
function applyFooter(pptx) {
  const slides = pptx.slides || [];
  const total = slides.length;
  slides.forEach((s, i) => {
    s.addText("AgentForge  ·  Confidential", {
      x: 0.3, y: 7.2, w: 6, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri",
    });
    s.addText(`Page ${i + 1} of ${total}`, {
      x: 7.5, y: 7.2, w: 2.2, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri", align: "right",
    });
    s.addShape("line", { x: 0.3, y: 7.15, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
  });
}

/* ─── Public entry point ───────────────────────────────────────────────── */
export async function generateProcessPPTX(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessPPTX: invalid analysis payload");
  }
  const processKey = data.process._key || data.process.id;
  if (!processKey) throw new Error("generateProcessPPTX: process_key missing");

  const resp = await getProcessBlueprint(processKey);
  const env  = unwrap(resp);
  const payload = env?.data || env;
  if (!payload || !payload.cover || !Array.isArray(payload.sections)) {
    throw new Error("Blueprint API returned an invalid payload.");
  }

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "STD_10X75", width: SLIDE_W, height: SLIDE_H });
  pptx.layout  = "STD_10X75";
  pptx.author  = "AgentForge";
  pptx.title   = (payload.cover?.title || "Blueprint").replace(/[^\x00-\x7F]/g, " ");
  pptx.defineSlideMaster({ title: "MASTER", background: { color: T.paper }, objects: [] });

  // Cover
  addCover(pptx, payload.cover);

  // Sections
  for (const sec of payload.sections) {
    renderSection(pptx, sec);
  }

  // Closing
  renderClosing(pptx, payload.closing);

  // Footer pass
  applyFooter(pptx);

  const fname = `${(payload.cover?.title || "Process").replace(/[^a-z0-9_-]+/gi, "_")}_Blueprint.pptx`;
  await pptx.writeFile({ fileName: fname });
}
