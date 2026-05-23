/**
 * pdfBlockRenderer.js
 *
 * Renders the framework-agnostic "blocks" produced by exportSectionsAddon.js
 * into a jsPDF document.  This is the bridge between the data-shape and the
 * existing PDF generators — kept separate so we don't bloat the main file.
 *
 * Usage:
 *   import { renderBlocks } from './pdfBlockRenderer';
 *   y = renderBlocks(doc, y, blocks, palette, { ML, MR, PW, PH, MBot });
 */

export const DEFAULT_PALETTE = {
  navy:   [15, 23, 42],
  accent: [16, 185, 129],
  amber:  [217, 119, 6],
  blue:   [37, 99, 235],
  ink:    [30, 41, 59],
  gray1:  [51, 65, 85],
  gray2:  [100, 116, 139],
  gray3:  [148, 163, 184],
  gray4:  [203, 213, 225],
  border: [226, 232, 240],
  surface:[248, 250, 252],
};

export function renderBlocks(doc, y, blocks, palette = DEFAULT_PALETTE, opts = {}) {
  if (!Array.isArray(blocks) || blocks.length === 0) return y;

  const { ML = 18, MR = 18, PW = 210, PH = 297, MBot = 18 } = opts;
  const CW = PW - ML - MR;

  const ink = (c) => doc.setTextColor(...c);
  const fill = (c) => doc.setFillColor(...c);
  const stroke = (c) => doc.setDrawColor(...c);
  const setFont = (w = "normal", s = 10) => {
    doc.setFontSize(s);
    doc.setFont("helvetica", w);
  };
  const text = (s, x, yy, o) => { if (s != null) doc.text(String(s), x, yy, o); };

  const breakIfNeeded = (yy, needed) => {
    if (yy + needed > PH - MBot - 8) {
      doc.addPage("a4", "portrait");
      return 22;
    }
    return yy;
  };

  const drawWrap = (s, x, yy, maxW, opt = {}) => {
    const { size = 10, color = palette.ink, weight = "normal", lineH = 5.2 } = opt;
    setFont(weight, size);
    ink(color);
    const lines = doc.splitTextToSize(String(s ?? ""), maxW);
    lines.forEach((ln, i) => text(ln, x, yy + i * lineH));
    return yy + lines.length * lineH;
  };

  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;

    if (b.type === "heading") {
      const level = b.level || 1;
      const needed = level === 1 ? 18 : 12;
      y = breakIfNeeded(y, needed);
      if (level === 1) {
        setFont("bold", 16);
        ink(palette.navy);
        text(b.text || "", ML, y + 6);
        stroke(palette.accent); doc.setLineWidth(0.5);
        doc.line(ML, y + 9, PW - MR, y + 9);
        y += 14;
      } else if (level === 2) {
        setFont("bold", 12);
        ink(palette.accent);
        text(b.text || "", ML, y + 5);
        y += 9;
      } else {
        setFont("bold", 10);
        ink(palette.gray1);
        text(b.text || "", ML, y + 4);
        y += 7;
      }
      continue;
    }

    if (b.type === "paragraph") {
      y = breakIfNeeded(y, 8);
      y = drawWrap(b.text || "", ML, y, CW, { size: 9.5, color: palette.ink, lineH: 5 });
      y += 4;
      continue;
    }

    if (b.type === "bullets") {
      const items = b.items || [];
      for (const item of items) {
        y = breakIfNeeded(y, 7);
        fill(palette.accent);
        doc.circle(ML + 2, y - 1.2, 0.8, "F");
        y = drawWrap(item, ML + 7, y, CW - 7, { size: 9.5, color: palette.ink, lineH: 4.8 });
        y += 1.5;
      }
      y += 2;
      continue;
    }

    if (b.type === "kv") {
      const rows = b.rows || [];
      const keyW = 50;
      for (const [k, v] of rows) {
        y = breakIfNeeded(y, 10);
        setFont("bold", 8);
        ink(palette.accent);
        text(String(k).toUpperCase(), ML, y + 3);
        setFont("normal", 9.5);
        ink(palette.ink);
        const lines = doc.splitTextToSize(String(v ?? ""), CW - keyW - 2);
        lines.forEach((ln, i) => text(ln, ML + keyW, y + 3 + i * 4.5));
        y += Math.max(6, lines.length * 4.5 + 1);
      }
      y += 3;
      continue;
    }

    if (b.type === "callout") {
      const tone = b.tone === "warn" ? palette.amber : palette.blue;
      const lines = doc.splitTextToSize(b.text || "", CW - 10);
      const h = 6 + lines.length * 4.5 + 3;
      y = breakIfNeeded(y, h + 4);
      fill(palette.surface);
      doc.roundedRect(ML, y, CW, h, 1.5, 1.5, "F");
      fill(tone);
      doc.rect(ML, y, 1.5, h, "F");
      setFont("normal", 9);
      ink(palette.ink);
      lines.forEach((ln, i) => text(ln, ML + 5, y + 6 + i * 4.5));
      y += h + 4;
      continue;
    }

    if (b.type === "table") {
      const headers = b.headers || [];
      const rows = b.rows || [];
      if (headers.length === 0) continue;

      const nCols = headers.length;
      const colW = CW / nCols;
      const rowMinH = 8;

      // header row
      y = breakIfNeeded(y, 12);
      fill(palette.navy);
      doc.rect(ML, y, CW, 8, "F");
      setFont("bold", 8);
      ink([255, 255, 255]);
      headers.forEach((h, i) => text(String(h), ML + i * colW + 2, y + 5.5));
      y += 8;

      // body rows
      rows.forEach((row, ri) => {
        // pre-compute row height based on tallest wrapped column
        let maxLines = 1;
        const wrapped = row.map((cell, i) => {
          const lines = doc.splitTextToSize(String(cell ?? ""), colW - 4);
          if (lines.length > maxLines) maxLines = lines.length;
          return lines;
        });
        const rowH = Math.max(rowMinH, maxLines * 4.2 + 3);
        y = breakIfNeeded(y, rowH + 1);
        if (ri % 2 === 0) {
          fill(palette.surface);
          doc.rect(ML, y, CW, rowH, "F");
        }
        setFont("normal", 8.5);
        ink(palette.ink);
        wrapped.forEach((lines, i) => {
          lines.forEach((ln, li) =>
            text(ln, ML + i * colW + 2, y + 5 + li * 4.2)
          );
        });
        stroke(palette.border); doc.setLineWidth(0.15);
        doc.line(ML, y + rowH, PW - MR, y + rowH);
        y += rowH;
      });
      y += 4;
      continue;
    }
  }

  return y;
}

/* ─── Workflow graph renderer that mirrors the UI swimlane ─────────────── */
/**
 * Draws a lane-based workflow graph onto a fresh landscape page.
 * Mirrors the UI swimlane (start/end pills, decision diamonds, lane tints).
 *
 * @param doc        jsPDF instance
 * @param flow       { title, lanes:[{id,label,nodes:[{id,type,label,column}]}], flow:[{from,to,label?}] }
 * @param palette    optional palette
 */
export function renderWorkflowOnNewLandscapePage(doc, flow, palette = DEFAULT_PALETTE) {
  doc.addPage("a4", "landscape");
  const lpw = doc.internal.pageSize.getWidth();
  const lph = doc.internal.pageSize.getHeight();

  const ink = (c) => doc.setTextColor(...c);
  const fill = (c) => doc.setFillColor(...c);
  const stroke = (c) => doc.setDrawColor(...c);
  const setFont = (w = "normal", s = 10) => {
    doc.setFontSize(s);
    doc.setFont("helvetica", w);
  };
  const text = (s, x, y, o) => { if (s != null) doc.text(String(s), x, y, o); };

  fill([255, 255, 255]);
  doc.rect(0, 0, lpw, lph, "F");

  setFont("bold", 16);
  ink(palette.navy);
  text("Agentic Process Workflow", 18, 26);
  if (flow?.title) {
    setFont("normal", 9);
    ink(palette.gray2);
    text(flow.title, 18, 32);
  }
  stroke(palette.accent); doc.setLineWidth(0.5);
  doc.line(18, 36, lpw - 18, 36);

  if (!flow || !flow.lanes || flow.lanes.length === 0) {
    setFont("italic", 11);
    ink(palette.gray2);
    text("No workflow graph available for this suggestion.", 18, 60);
    return;
  }

  // Collect global columns
  const colSet = new Set();
  flow.lanes.forEach(l => (l.nodes || []).forEach(n => colSet.add(n.column ?? 1)));
  const cols = Array.from(colSet).sort((a, b) => a - b);
  const colIndex = new Map();
  cols.forEach((c, i) => colIndex.set(c, i));

  const margin = 18;
  const startY = 42;
  const usableW = lpw - margin * 2;
  const usableH = lph - startY - 18;

  const laneLabelW = 36;
  const nCols = Math.max(1, cols.length);
  const colGap = 6;
  let nodeW = Math.max(28, Math.floor((usableW - laneLabelW - (nCols - 1) * colGap) / nCols));
  nodeW = Math.min(80, nodeW);
  const nodeH = 18;
  const laneH = Math.max(28, Math.floor(usableH / flow.lanes.length));

  // Lane accents — cycle through
  const ACCENTS = [
    ["#3B82F6", "#EFF6FF"], ["#8B5CF6", "#F5F3FF"], ["#10B981", "#ECFDF5"],
    ["#F59E0B", "#FFFBEB"], ["#F43F5E", "#FFF1F2"], ["#06B6D4", "#ECFEFF"],
    ["#6366F1", "#EEF2FF"],
  ];
  const hex = (h) => {
    const m = String(h).replace("#", "").match(/[a-f0-9]{2}/gi);
    return m ? m.map((x) => parseInt(x, 16)) : [128, 128, 128];
  };

  const xForCol = (c) =>
    margin + laneLabelW + colIndex.get(c) * (nodeW + colGap);

  // Build node lookup for edge drawing
  const nodePos = new Map();

  // Lanes + nodes
  flow.lanes.forEach((lane, li) => {
    const [accent, tint] = ACCENTS[li % ACCENTS.length];
    const ly = startY + li * laneH;

    // lane background tint
    fill(hex(tint));
    doc.rect(margin + laneLabelW, ly, usableW - laneLabelW, laneH, "F");
    // lane label cell
    fill(hex(tint));
    doc.rect(margin, ly, laneLabelW, laneH, "F");
    fill(hex(accent));
    doc.rect(margin, ly, 2, laneH, "F");

    setFont("bold", 9);
    ink(hex(accent));
    const labelLines = doc.splitTextToSize(lane.label || "", laneLabelW - 4);
    labelLines.forEach((ln, i) =>
      text(ln, margin + (laneLabelW / 2) + 1, ly + laneH / 2 - (labelLines.length - 1) * 2 + i * 4, { align: "center" })
    );

    // nodes
    (lane.nodes || []).forEach((n) => {
      const nx = xForCol(n.column ?? 1);
      const ny = ly + (laneH - nodeH) / 2;
      nodePos.set(n.id, { x: nx, y: ny, w: nodeW, h: nodeH, type: n.type });

      const t = (n.type || "process").toLowerCase();
      if (t === "start" || t === "end") {
        // green pill
        fill(hex("#D1FAE5"));
        doc.roundedRect(nx, ny, nodeW, nodeH, nodeH / 2, nodeH / 2, "F");
        stroke(hex("#6EE7B7")); doc.setLineWidth(0.4);
        doc.roundedRect(nx, ny, nodeW, nodeH, nodeH / 2, nodeH / 2, "S");
        setFont("bold", 9);
        ink(hex("#047857"));
        text(n.label || (t === "start" ? "Start" : "End"),
             nx + nodeW / 2, ny + nodeH / 2 + 3, { align: "center" });
      } else if (t === "decision") {
        // blue diamond
        const cx = nx + nodeW / 2, cy = ny + nodeH / 2;
        const dx = nodeW / 2, dy = nodeH / 2;
        fill(hex("#E0E7FF"));
        stroke(hex("#A5B4FC")); doc.setLineWidth(0.4);
        doc.lines([[dx, -dy], [dx, dy], [-dx, dy], [-dx, -dy]], cx - dx, cy, [1, 1], "FD", true);
        setFont("bold", 8);
        ink(hex("#3730A3"));
        const lines = doc.splitTextToSize(n.label || "", nodeW - 6);
        lines.slice(0, 2).forEach((ln, i) =>
          text(ln, cx, cy - 1 + i * 3.5, { align: "center" })
        );
      } else {
        // process — white with lane accent stripe
        fill([255, 255, 255]);
        doc.roundedRect(nx, ny, nodeW, nodeH, 2, 2, "F");
        stroke(hex(accent)); doc.setLineWidth(0.4);
        doc.roundedRect(nx, ny, nodeW, nodeH, 2, 2, "S");
        fill(hex(accent));
        doc.rect(nx, ny, 1.5, nodeH, "F");
        setFont("bold", 8);
        ink([31, 41, 55]);
        const lines = doc.splitTextToSize(n.label || "", nodeW - 5);
        const lineH = 3.5;
        const total = lines.length * lineH;
        lines.slice(0, 3).forEach((ln, i) =>
          text(ln, nx + nodeW / 2 + 0.7, ny + nodeH / 2 - total / 2 + (i + 0.85) * lineH, { align: "center" })
        );
      }
    });
  });

  // Edges
  stroke(palette.gray2); doc.setLineWidth(0.4);
  (flow.flow || []).forEach((e) => {
    const a = nodePos.get(e.from);
    const b = nodePos.get(e.to);
    if (!a || !b) return;

    let fx, fy, tx, ty;
    if (a.y === b.y) {
      // horizontal in same lane (or aligned)
      const goingRight = b.x > a.x;
      fx = goingRight ? a.x + a.w : a.x;
      fy = a.y + a.h / 2;
      tx = goingRight ? b.x : b.x + b.w;
      ty = b.y + b.h / 2;
      doc.line(fx, fy, tx, ty);
      // arrowhead
      const dir = goingRight ? 1 : -1;
      const head = 2;
      fill(palette.gray2);
      doc.triangle(tx, ty,
                   tx - dir * head, ty - head * 0.6,
                   tx - dir * head, ty + head * 0.6, "F");
    } else {
      // inter-lane — L-shape via midX
      const goingRight = b.x >= a.x;
      fx = goingRight ? a.x + a.w : a.x;
      fy = a.y + a.h / 2;
      tx = goingRight ? b.x : b.x + b.w;
      ty = b.y + b.h / 2;
      const midX = (fx + tx) / 2;
      doc.line(fx, fy, midX, fy);
      doc.line(midX, fy, midX, ty);
      doc.line(midX, ty, tx, ty);
      const dir = goingRight ? 1 : -1;
      const head = 2;
      fill(palette.gray2);
      doc.triangle(tx, ty,
                   tx - dir * head, ty - head * 0.6,
                   tx - dir * head, ty + head * 0.6, "F");
    }
  });
}
