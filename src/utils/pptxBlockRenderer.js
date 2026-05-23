/**
 * pptxBlockRenderer.js
 *
 * Converts the framework-agnostic "blocks" produced by exportSectionsAddon.js
 * into pptxgenjs slides.  Used by pptxGenerator.js to render the new sections
 * (System & Module Inventory, CSV Source Detection, Document Data Lineage,
 * Per-Suggestion Blueprint).
 *
 * The renderer is paginated: long sections automatically continue onto a new
 * slide when content would overflow the safe area.
 *
 * Pair with pptxGenerator.js — see the patch notes at the bottom of this file.
 */

const T = {
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

// Slide is 10 x 7.5 inches (matches pptxGenerator.js layout)
const SLIDE_W = 10;
const SLIDE_H = 7.5;
const MARGIN_X = 0.5;
const TOP_Y    = 0.4;
const BOTTOM_Y = 7.0;     // leave space for footer

function newContentSlide(pptx, sectionTitle) {
  const slide = pptx.addSlide({ masterName: "MASTER" });
  // Header
  slide.addText(sectionTitle || "", {
    x: MARGIN_X, y: TOP_Y, w: SLIDE_W - MARGIN_X * 2, h: 0.5,
    fontSize: 22, bold: true, color: T.ink, fontFace: "Calibri",
  });
  // Accent rule under the header
  slide.addShape("line", {
    x: MARGIN_X, y: TOP_Y + 0.55, w: SLIDE_W - MARGIN_X * 2, h: 0,
    line: { color: T.brand, width: 1 },
  });
  return slide;
}

function approxLines(text, charsPerLine = 95) {
  if (!text) return 1;
  const lines = String(text).split("\n");
  let total = 0;
  for (const line of lines) {
    total += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return total;
}

/**
 * Render the blocks list as additional slides on `pptx`.
 *
 * @param pptx   pptxgenjs instance
 * @param blocks Array of blocks (see exportSectionsAddon.js)
 */
export function renderBlocksAsPptxSlides(pptx, blocks) {
  if (!pptx || !Array.isArray(blocks) || blocks.length === 0) return;

  // Each H1 starts a new slide; subsequent blocks flow underneath until full,
  // then continue on a new slide with "<Title> (cont.)" header.
  let slide = null;
  let cursorY = 1.1;
  let currentTitle = "";
  let isContinuation = false;

  const newPage = () => {
    isContinuation = currentTitle && slide !== null;
    slide = newContentSlide(pptx, isContinuation ? `${currentTitle} (cont.)` : currentTitle);
    cursorY = 1.1;
  };

  const ensureSpace = (needed) => {
    if (!slide) { newPage(); return; }
    if (cursorY + needed > BOTTOM_Y) { newPage(); }
  };

  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;

    if (b.type === "heading" && (b.level === 1 || !b.level)) {
      currentTitle = b.text || "";
      isContinuation = false;
      slide = newContentSlide(pptx, currentTitle);
      cursorY = 1.1;
      continue;
    }

    if (b.type === "heading") {
      ensureSpace(0.5);
      const isL2 = b.level === 2;
      slide.addText(b.text || "", {
        x: MARGIN_X, y: cursorY, w: SLIDE_W - MARGIN_X * 2, h: 0.4,
        fontSize: isL2 ? 16 : 13, bold: true,
        color: isL2 ? T.brandDk : T.ink, fontFace: "Calibri",
      });
      cursorY += 0.45;
      continue;
    }

    if (b.type === "paragraph") {
      const lines = approxLines(b.text || "");
      const h = Math.max(0.3, lines * 0.22 + 0.08);
      ensureSpace(h);
      slide.addText(b.text || "", {
        x: MARGIN_X, y: cursorY, w: SLIDE_W - MARGIN_X * 2, h,
        fontSize: 11, color: T.ink, fontFace: "Calibri", valign: "top",
      });
      cursorY += h + 0.05;
      continue;
    }

    if (b.type === "bullets") {
      const items = b.items || [];
      const linesEst = items.reduce((acc, it) => acc + approxLines(it, 90), 0);
      const h = Math.max(0.3, linesEst * 0.22 + items.length * 0.06);
      ensureSpace(h);
      slide.addText(items.map((t) => ({ text: t, options: { bullet: true } })), {
        x: MARGIN_X + 0.1, y: cursorY, w: SLIDE_W - MARGIN_X * 2 - 0.1, h,
        fontSize: 11, color: T.ink, fontFace: "Calibri",
        paraSpaceAfter: 4, valign: "top",
      });
      cursorY += h + 0.05;
      continue;
    }

    if (b.type === "kv") {
      const rows = b.rows || [];
      const rowH = 0.32;
      const totalH = rows.length * rowH + 0.1;
      ensureSpace(Math.min(totalH, BOTTOM_Y - cursorY));

      const tableRows = rows.map(([k, v]) => [
        { text: String(k).toUpperCase(),
          options: { bold: true, color: T.brandDk, fontSize: 9, fill: { color: T.surface } } },
        { text: String(v ?? "—"),
          options: { color: T.ink, fontSize: 10 } },
      ]);

      slide.addTable(tableRows, {
        x: MARGIN_X, y: cursorY, w: SLIDE_W - MARGIN_X * 2,
        colW: [2.5, SLIDE_W - MARGIN_X * 2 - 2.5],
        rowH,
        border: { type: "solid", pt: 0.5, color: T.rule },
        fontFace: "Calibri",
      });
      cursorY += totalH + 0.1;
      continue;
    }

    if (b.type === "callout") {
      const lines = approxLines(b.text || "", 100);
      const h = Math.max(0.4, lines * 0.22 + 0.2);
      ensureSpace(h);
      const stripe = b.tone === "warn" ? T.amber : T.blue;
      const fill   = b.tone === "warn" ? "FEF3C7" : "DBEAFE";
      slide.addShape("roundRect", {
        x: MARGIN_X, y: cursorY, w: SLIDE_W - MARGIN_X * 2, h,
        fill: { color: fill }, line: { color: stripe, width: 1 },
        rectRadius: 0.05,
      });
      slide.addShape("rect", {
        x: MARGIN_X, y: cursorY, w: 0.06, h,
        fill: { color: stripe }, line: { color: stripe },
      });
      slide.addText(b.text || "", {
        x: MARGIN_X + 0.15, y: cursorY + 0.05,
        w: SLIDE_W - MARGIN_X * 2 - 0.2, h: h - 0.1,
        fontSize: 10, color: T.ink, fontFace: "Calibri", valign: "top",
      });
      cursorY += h + 0.1;
      continue;
    }

    if (b.type === "table") {
      const headers = b.headers || [];
      const rows = b.rows || [];
      if (headers.length === 0) continue;

      const headerRow = headers.map((h) => ({
        text: h,
        options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9 },
      }));
      const bodyRows = rows.map((row) => row.map((cell) => ({
        text: String(cell ?? ""),
        options: { color: T.ink, fontSize: 9 },
      })));
      const allRows = [headerRow, ...bodyRows];

      const rowH = 0.32;
      const totalH = allRows.length * rowH + 0.1;
      ensureSpace(Math.min(totalH, BOTTOM_Y - cursorY));

      // Even col widths
      const totalW = SLIDE_W - MARGIN_X * 2;
      const colW = Array(headers.length).fill(totalW / headers.length);

      slide.addTable(allRows, {
        x: MARGIN_X, y: cursorY, w: totalW,
        colW, rowH,
        border: { type: "solid", pt: 0.5, color: T.rule },
        fontFace: "Calibri",
      });
      cursorY += totalH + 0.1;
      continue;
    }
  }
}


/**
 * ════════════════════════════════════════════════════════════════════════════
 *  PATCH NOTES for pptxGenerator.js
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ▶ EDIT 1 — imports at the top of pptxGenerator.js
 *
 *   ADD these two imports near the top (e.g. right after the pptxgen import):
 *
 *       import { buildAddonBlocks }        from "./exportSectionsAddon";
 *       import { renderBlocksAsPptxSlides } from "./pptxBlockRenderer";
 *
 *
 * ▶ EDIT 2 — use the canonical workflow graph + add addon slides
 *
 *   Find inside generatePPTX(), the block:
 *       addCoverSlide(pptx, data, title);
 *       addTOCSlide(pptx, data);
 *       addWorkflowSlide(pptx, flowData);
 *
 *       (data.sections || []).forEach((section, i) => addSectionSlides(pptx, section, i));
 *
 *   REPLACE with:
 *       addCoverSlide(pptx, data, title);
 *       addTOCSlide(pptx, data);
 *
 *       // Prefer the canonical workflow graph (guaranteed Start/End)
 *       const canonicalFlow =
 *         (data && data.agentic_workflow_graph) || flowData;
 *       addWorkflowSlide(pptx, canonicalFlow);
 *
 *       (data.sections || []).forEach((section, i) =>
 *         addSectionSlides(pptx, section, i));
 *
 *       // ─── NEW: addon slides ───────────────────────────────────────────
 *       renderBlocksAsPptxSlides(pptx, buildAddonBlocks(data));
 *
 *
 * No other edits required.  The slides will pick up the existing master and
 * the post-loop footer pass will paginate them automatically.
 */
