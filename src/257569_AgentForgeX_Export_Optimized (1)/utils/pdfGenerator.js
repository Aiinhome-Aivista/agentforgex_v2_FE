/**
 * pdfGenerator.js — AgentForgeX Technical Design Document
 *
 * Native jsPDF vector/text rendering. Zero html2canvas, zero PNG bloat.
 *
 * Fixes vs previous version (per marked-up PDF feedback):
 *   • Single footer per page (no duplicate cover-page footer)
 *   • Tech-stack rows printed once (no duplicate values)
 *   • Metrics targets wrap inside their cards (no cut-off text)
 *   • TOC derived from sections array (no missing section 7)
 *   • Cover title no longer concatenates duplicatively with subtitle
 *   • Agent cards never split across page boundaries
 *   • REAL swimlane workflow rendered from /processes/:id/flow data
 *   • Enterprise/consulting visual style: white bg, navy/emerald accents
 */

import jsPDF from "jspdf";
import { layoutWorkflow, hasFlowData } from "./workflowRenderer";

/* ─── Palette ────────────────────────────────────────────────────────── */
const C = {
  bg:        [255, 255, 255],
  surface:   [248, 250, 252],
  card:      [255, 255, 255],
  accent:    [16, 185, 129],
  accentDk:  [4, 120, 87],
  navy:      [15, 23, 42],
  ink:       [30, 41, 59],
  gray1:     [51, 65, 85],
  gray2:     [100, 116, 139],
  gray3:     [148, 163, 184],
  gray4:     [203, 213, 225],
  border:    [226, 232, 240],
  red:       [220, 38, 38],
  amber:     [217, 119, 6],
  blue:      [37, 99, 235],
  violet:    [124, 58, 237],
};

const PW = 210, PH = 297;
const ML = 18, MR = 18, MTop = 22, MBot = 18;
const CW = PW - ML - MR;
const FOOTER_H = 10;

/* ─── Drawing helpers ────────────────────────────────────────────────── */
const fill   = (d, c) => d.setFillColor(...c);
const stroke = (d, c) => d.setDrawColor(...c);
const ink    = (d, c) => d.setTextColor(...c);
const setFont = (d, w = "normal", s = 10) => { d.setFontSize(s); d.setFont("helvetica", w); };
const text = (d, s, x, y, o) => { if (s != null) d.text(String(s), x, y, o); };

function rect(d, x, y, w, h, color, r = 0) {
  fill(d, color);
  if (r > 0) d.roundedRect(x, y, w, h, r, r, "F");
  else       d.rect(x, y, w, h, "F");
}
function strokeRect(d, x, y, w, h, color, lw = 0.2, r = 0) {
  stroke(d, color);
  d.setLineWidth(lw);
  if (r > 0) d.roundedRect(x, y, w, h, r, r, "S");
  else       d.rect(x, y, w, h, "S");
}
function hLine(d, x1, y, x2, color = C.border, lw = 0.2) {
  stroke(d, color);
  d.setLineWidth(lw);
  d.line(x1, y, x2, y);
}
function drawWrap(d, str, x, y, maxW, opts = {}) {
  const { size = 9.5, color = C.ink, weight = "normal", lineH = 5 } = opts;
  if (!str && str !== 0) return y;
  setFont(d, weight, size);
  ink(d, color);
  const lines = d.splitTextToSize(String(str), maxW);
  lines.forEach((ln, i) => text(d, ln, x, y + i * lineH));
  return y + lines.length * lineH;
}
function hexToRgb(hex) {
  const m = String(hex).replace("#", "").match(/[a-f0-9]{2}/gi);
  if (!m) return [128, 128, 128];
  return m.map(h => parseInt(h, 16));
}

/* ─── Page lifecycle ─────────────────────────────────────────────────── */
function drawPageBg(d) {
  fill(d, C.bg);
  d.rect(0, 0, PW, PH, "F");
  rect(d, 0, 0, 1.2, PH, C.accent);
}
function drawPageHeader(d) {
  setFont(d, "bold", 8);
  ink(d, C.gray2);
  text(d, "AgentForgeX", PW - MR, 11, { align: "right" });
  setFont(d, "normal", 7);
  ink(d, C.gray3);
  text(d, "Technical Design", PW - MR, 14.5, { align: "right" });
  hLine(d, ML, 17, PW - MR, C.border, 0.2);
}
function pageBreakIfNeeded(d, y, needed) {
  if (y + needed > PH - MBot) {
    d.addPage();
    drawPageBg(d);
    drawPageHeader(d);
    return MTop;
  }
  return y;
}
function startContentPage(d) {
  drawPageBg(d);
  drawPageHeader(d);
  return MTop;
}

/* ─── Section header / sub-section / card ────────────────────────────── */
function sectionTitle(d, y, number, title) {
  y = pageBreakIfNeeded(d, y, 22);
  setFont(d, "bold", 26);
  ink(d, C.accent);
  text(d, String(number).padStart(2, "0"), ML, y + 11);
  setFont(d, "bold", 16);
  ink(d, C.navy);
  text(d, title || "Section", ML + 18, y + 11);
  hLine(d, ML + 18, y + 14, PW - MR, C.accent, 0.5);
  return y + 22;
}
function subTitle(d, y, number, title) {
  y = pageBreakIfNeeded(d, y, 12);
  setFont(d, "bold", 11);
  ink(d, C.accent);
  text(d, number ? `${number} ${title}` : title, ML, y + 4);
  hLine(d, ML, y + 6.5, ML + 60, C.accent, 0.4);
  return y + 11;
}
function card(d, x, y, w, h, opts = {}) {
  const { fillC = C.card, borderC = C.border, accent = null, r = 1.5 } = opts;
  rect(d, x, y, w, h, fillC, r);
  strokeRect(d, x, y, w, h, borderC, 0.25, r);
  if (accent) rect(d, x, y, 1.5, h, accent, 0);
}

/* ─── COVER ──────────────────────────────────────────────────────────── */
function drawCover(d, data, suggestionTitle) {
  drawPageBg(d);
  const cp = data.cover_page || data.document_metadata || {};

  rect(d, 0, 0, PW, 6, C.accent);
  rect(d, 0, 6, PW, 0.5, C.accentDk);

  setFont(d, "bold", 12);
  ink(d, C.navy);
  text(d, "AgentForgeX", ML, 22);
  setFont(d, "normal", 8);
  ink(d, C.gray2);
  text(d, "POWERED BY AGENTIC AI", ML + 28, 22);

  setFont(d, "bold", 7);
  const cwLabel = "CONFIDENTIAL";
  const cw = d.getTextWidth(cwLabel) + 6;
  strokeRect(d, PW - MR - cw, 17, cw, 7, C.accent, 0.4, 2);
  ink(d, C.accent);
  text(d, cwLabel, PW - MR - cw / 2, 21.5, { align: "center" });

  setFont(d, "bold", 9);
  ink(d, C.accent);
  text(d, (cp.document_type || "TECHNICAL DESIGN DOCUMENT").toUpperCase(), ML, 80);

  let title = suggestionTitle || cp.title || "Technical Design";
  if (suggestionTitle && cp.title && cp.title.includes(suggestionTitle)) title = cp.title;
  setFont(d, "bold", 26);
  ink(d, C.navy);
  const titleLines = d.splitTextToSize(title, CW - 4);
  titleLines.slice(0, 4).forEach((ln, i) => text(d, ln, ML, 96 + i * 11));

  const subY = 96 + Math.min(titleLines.length, 4) * 11 + 6;
  if (cp.subtitle && cp.subtitle !== title && !title.includes(cp.subtitle)) {
    setFont(d, "normal", 13);
    ink(d, C.gray1);
    const subLines = d.splitTextToSize(cp.subtitle, CW - 4);
    subLines.slice(0, 2).forEach((ln, i) => text(d, ln, ML, subY + i * 7));
  }

  rect(d, ML, 175, CW, 0.6, C.accent);

  const meta = [
    ["DATE",           cp.date           || "—"],
    ["VERSION",        cp.version        || "Draft V1.0"],
    ["ORGANIZATION",   cp.organization   || "—"],
    ["CLASSIFICATION", cp.classification || "Confidential"],
  ];
  const colW = CW / 2;
  meta.forEach(([label, val], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = ML + col * colW, y = 185 + row * 22;
    setFont(d, "bold", 8);
    ink(d, C.accent);
    text(d, label, x, y);
    setFont(d, "bold", 13);
    ink(d, C.navy);
    text(d, String(val), x, y + 8);
  });

  rect(d, 0, PH - 14, PW, 14, C.navy);
  setFont(d, "normal", 8);
  ink(d, [255, 255, 255]);
  text(d, "Generated by AgentForgeX  ·  AI-Powered Technical Design Platform", ML, PH - 5);
  setFont(d, "bold", 8);
  text(d, "Page 1", PW - MR, PH - 5, { align: "right" });
}

/* ─── TOC ────────────────────────────────────────────────────────────── */
function drawTOC(d, data, sectionStartPages) {
  let y = startContentPage(d);
  setFont(d, "bold", 22);
  ink(d, C.navy);
  text(d, "Table of Contents", ML, y + 8);
  hLine(d, ML, y + 11, PW - MR, C.accent, 0.6);
  y += 22;

  const sections = data.sections || [];
  sections.forEach((sec, i) => {
    y = pageBreakIfNeeded(d, y, 11);
    const num = String(sec.section_number || sec.section_no || (i + 1)).padStart(2, "0");
    const title = sec.title || "Section";
    const page = sectionStartPages?.[i] ?? "";

    if (i % 2 === 0) rect(d, ML, y - 5, CW, 9, C.surface, 1);

    setFont(d, "bold", 10);
    ink(d, C.accent);
    text(d, num, ML + 3, y + 1);

    setFont(d, "normal", 10);
    ink(d, C.navy);
    text(d, title, ML + 15, y + 1);

    stroke(d, C.gray4);
    d.setLineWidth(0.15);
    d.setLineDashPattern([0.6, 1.2], 0);
    const titleW = d.getTextWidth(title);
    d.line(ML + 17 + titleW, y - 1, PW - MR - 12, y - 1);
    d.setLineDashPattern([], 0);

    if (page) {
      setFont(d, "bold", 10);
      ink(d, C.gray1);
      text(d, String(page), PW - MR - 2, y + 1, { align: "right" });
    }
    y += 9;
  });
}

/* ─── SWIMLANE WORKFLOW (landscape page) ─────────────────────────────── */
function drawSwimlaneWorkflowPage(d, flowData) {
  d.addPage("a4", "landscape");
  const lpw = d.internal.pageSize.getWidth();
  const lph = d.internal.pageSize.getHeight();

  fill(d, C.bg);
  d.rect(0, 0, lpw, lph, "F");
  rect(d, 0, 0, 1.2, lph, C.accent);

  setFont(d, "bold", 8);
  ink(d, C.gray2);
  text(d, "AgentForgeX", lpw - 18, 11, { align: "right" });
  setFont(d, "normal", 7);
  ink(d, C.gray3);
  text(d, "Technical Design  ·  Agentic Process Workflow", lpw - 18, 14.5, { align: "right" });
  hLine(d, 18, 17, lpw - 18, C.border, 0.2);

  setFont(d, "bold", 18);
  ink(d, C.navy);
  text(d, "Agentic Process Workflow", 18, 28);
  setFont(d, "normal", 9);
  ink(d, C.gray2);
  text(d, flowData?.title || "Cross-functional swimlane derived from the live process model", 18, 34);
  hLine(d, 18, 37, lpw - 18, C.accent, 0.4);

  if (!hasFlowData(flowData)) {
    setFont(d, "italic", 10);
    ink(d, C.gray2);
    text(d, "Process flow data not available for this suggestion.", 18, 60);
    drawLandscapeFooter(d, lpw, lph);
    return;
  }

  // workflowRenderer returns positions in mm
  const layout = layoutWorkflow(flowData, {
    nodeW: 42, nodeH: 16, colGap: 10, laneHeight: 28, laneLabelWidth: 32, padding: 0, titleHeight: 0,
  });

  const usableW = lpw - 36;
  const usableH = lph - 63;
  const startY  = 45;

  const scaleW = usableW / layout.width;
  const scaleH = usableH / layout.height;
  const scale  = Math.min(scaleW, scaleH, 1);

  const renderedW = layout.width * scale;
  const renderedH = layout.height * scale;
  const ox = 18 + Math.max(0, (usableW - renderedW) / 2);
  const oy = startY + Math.max(0, (usableH - renderedH) / 2);

  const laneLabelW = 32 * scale;

  // Lane backgrounds + labels
  layout.lanes.forEach((lane, i) => {
    const ly = oy + lane.top * scale;
    const lh = lane.height * scale;

    rect(d, ox + laneLabelW, ly, renderedW - laneLabelW, lh,
         i % 2 === 0 ? C.surface : C.bg, 0);
    rect(d, ox, ly, laneLabelW, lh, hexToRgb(lane.tint), 0);
    strokeRect(d, ox, ly, laneLabelW, lh, C.border, 0.2, 0);
    rect(d, ox, ly, Math.max(1, 1.5 * scale), lh, hexToRgb(lane.accent), 0);

    const labelFont = Math.max(6.5, 8 * Math.sqrt(scale));
    setFont(d, "bold", labelFont);
    ink(d, hexToRgb(lane.text));
    const labelLines = (lane.label || "").split("\n").flatMap(l => d.splitTextToSize(l, laneLabelW - 4));
    const lineH = labelFont * 0.42;
    const totalH = labelLines.length * lineH;
    labelLines.forEach((ln, li) => {
      text(d, ln, ox + 3, ly + lh / 2 - totalH / 2 + lineH * 0.7 + li * lineH);
    });

    stroke(d, C.border);
    d.setLineWidth(0.2);
    d.setLineDashPattern([0.8, 1.6], 0);
    d.line(ox, ly + lh, ox + renderedW, ly + lh);
    d.setLineDashPattern([], 0);
  });

  // Edges (under nodes)
  layout.edges.forEach(e => {
    const fx = ox + e.fromX * scale;
    const fy = oy + e.fromY * scale;
    const tx = ox + e.toX   * scale;
    const ty = oy + e.toY   * scale;

    stroke(d, C.gray2);
    d.setLineWidth(0.4);
    const head = 1.6;

    if (Math.abs(fy - ty) < 0.5) {
      const dir = tx >= fx ? 1 : -1;
      d.line(fx, fy, tx - dir * head, ty);
      fill(d, C.gray2);
      d.triangle(tx, ty,
                 tx - dir * head, ty - head * 0.6,
                 tx - dir * head, ty + head * 0.6, "F");
    } else if (Math.abs(fx - tx) < 0.5) {
      const dir = ty >= fy ? 1 : -1;
      d.line(fx, fy, tx, ty - dir * head);
      fill(d, C.gray2);
      d.triangle(tx, ty,
                 tx - head * 0.6, ty - dir * head,
                 tx + head * 0.6, ty - dir * head, "F");
    } else {
      const midX = (fx + tx) / 2;
      d.line(fx, fy, midX, fy);
      d.line(midX, fy, midX, ty);
      const dir = tx >= midX ? 1 : -1;
      d.line(midX, ty, tx - dir * head, ty);
      fill(d, C.gray2);
      d.triangle(tx, ty,
                 tx - dir * head, ty - head * 0.6,
                 tx - dir * head, ty + head * 0.6, "F");
    }
  });

  // Nodes
  layout.nodes.forEach(n => {
    const nx = ox + n.x * scale;
    const ny = oy + n.y * scale;
    const nw = n.w * scale;
    const nh = n.h * scale;
    const stripeW = Math.max(0.6, 1.5 * scale);
    const fontPt = Math.max(5, Math.min(8, 0.42 * nh));

    if (n.type === "decision") {
      const cx = nx + nw / 2, cy = ny + nh / 2;
      const dx = nw / 2, dy = nh / 2;
      fill(d, hexToRgb(n.fill));
      stroke(d, hexToRgb(n.stroke));
      d.setLineWidth(0.4);
      d.lines([[dx, -dy], [dx, dy], [-dx, dy], [-dx, -dy]], cx - dx, cy, [1, 1], "FD", true);

      setFont(d, "bold", Math.max(5, fontPt - 1));
      ink(d, hexToRgb(n.text));
      const lines = d.splitTextToSize(n.label, nw - 3);
      const lineH = fontPt * 0.42;
      lines.slice(0, 2).forEach((ln, li) => {
        text(d, ln, cx, cy - (lines.length - 1) * lineH / 2 + (li + 0.5) * lineH, { align: "center" });
      });
    } else {
      const isStartEnd = n.type === "start" || n.type === "end";
      const radius = isStartEnd ? nh / 2 : 1.5;
      fill(d, hexToRgb(n.fill));
      d.roundedRect(nx, ny, nw, nh, radius, radius, "F");
      strokeRect(d, nx, ny, nw, nh, hexToRgb(n.stroke), 0.35, radius);
      rect(d, nx, ny, stripeW, nh, hexToRgb(n.accent), 0);

      setFont(d, "bold", fontPt);
      ink(d, hexToRgb(n.text));
      const innerPad = stripeW + 1.5;
      const lines = d.splitTextToSize(n.label, nw - innerPad * 2);
      const lineH = fontPt * 0.42;
      const shown = lines.slice(0, 3);
      const totalH = shown.length * lineH;
      shown.forEach((ln, li) => {
        text(d, ln, nx + nw / 2 + stripeW / 2,
             ny + nh / 2 - totalH / 2 + (li + 0.6) * lineH, { align: "center" });
      });
    }
  });

  drawLandscapeFooter(d, lpw, lph);
}
function drawLandscapeFooter(d, lpw, lph) {
  rect(d, 0, lph - 8, lpw, 8, C.navy);
  setFont(d, "normal", 7);
  ink(d, [255, 255, 255]);
  text(d, "AgentForgeX  ·  Confidential — AI-Generated Technical Design", 18, lph - 3);
  setFont(d, "bold", 7);
  const p = d.getNumberOfPages();
  text(d, `Page ${p}`, lpw - 18, lph - 3, { align: "right" });
}

/* ─── Content renderers ──────────────────────────────────────────────── */
function renderContentObject(d, y, content) {
  Object.entries(content).forEach(([k, v]) => {
    const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (typeof v === "string") {
      y = pageBreakIfNeeded(d, y, 14);
      setFont(d, "bold", 9); ink(d, C.accent);
      text(d, label, ML, y);
      y += 5;
      y = drawWrap(d, v, ML, y, CW, { size: 10, color: C.ink, lineH: 5.2 }) + 4;
    } else if (Array.isArray(v)) {
      y = pageBreakIfNeeded(d, y, 10);
      setFont(d, "bold", 9); ink(d, C.accent);
      text(d, label, ML, y);
      y += 5;
      v.forEach(item => {
        if (typeof item === "string") {
          y = pageBreakIfNeeded(d, y, 7);
          fill(d, C.accent);
          d.circle(ML + 2, y - 1.2, 0.7, "F");
          y = drawWrap(d, item, ML + 6, y, CW - 6, { size: 9.5, color: C.ink, lineH: 5 }) + 2;
        }
      });
      y += 2;
    } else if (typeof v === "object" && v !== null) {
      y = pageBreakIfNeeded(d, y, 10);
      setFont(d, "bold", 9); ink(d, C.accent);
      text(d, label, ML, y);
      y += 5;
      Object.entries(v).forEach(([k2, v2]) => {
        if (typeof v2 === "string") {
          y = pageBreakIfNeeded(d, y, 14);
          setFont(d, "bold", 8); ink(d, C.gray2);
          text(d, k2.replace(/_/g, " "), ML, y);
          y += 4.5;
          y = drawWrap(d, v2, ML, y, CW, { size: 9.5, color: C.ink, lineH: 5 }) + 3;
        }
      });
    }
  });
  return y;
}

function renderPrinciples(d, y, principles) {
  principles.forEach(p => {
    const appLines = d.splitTextToSize(p.application || "", CW - 16);
    const cardH = Math.max(20, 12 + appLines.length * 4.2);
    y = pageBreakIfNeeded(d, y, cardH + 4);
    card(d, ML, y, CW, cardH, { accent: C.accent });
    setFont(d, "bold", 9);
    fill(d, C.accent);
    d.circle(ML + 8, y + 7, 3.2, "F");
    ink(d, [255, 255, 255]);
    text(d, String(p.id || "•"), ML + 8, y + 8.5, { align: "center" });
    setFont(d, "bold", 10.5);
    ink(d, C.navy);
    text(d, p.name || "", ML + 15, y + 8.5);
    drawWrap(d, p.application || "", ML + 5, y + 14, CW - 10,
             { size: 8.5, color: C.gray1, lineH: 4.2 });
    y += cardH + 4;
  });
  return y;
}

function renderCategories(d, y, categories) {
  categories.forEach(cat => {
    const descLines = d.splitTextToSize(cat.description || "", CW - 10);
    const cardH = Math.max(18, 10 + descLines.length * 4.5);
    y = pageBreakIfNeeded(d, y, cardH + 4);
    card(d, ML, y, CW, cardH, { accent: C.accent, fillC: C.surface });
    setFont(d, "bold", 10);
    ink(d, C.accent);
    text(d, cat.type || "", ML + 5, y + 7);
    drawWrap(d, cat.description || "", ML + 5, y + 12, CW - 10,
             { size: 9, color: C.gray1, lineH: 4.5 });
    y += cardH + 4;
  });
  return y;
}

function renderArchitectureLayers(d, y, layers) {
  layers.forEach(layer => {
    y = pageBreakIfNeeded(d, y, 14);
    rect(d, ML, y, CW, 9, C.navy, 1.5);
    setFont(d, "bold", 11);
    ink(d, [255, 255, 255]);
    text(d, `Layer ${layer.layer_id}: ${layer.name}`, ML + 5, y + 6.2);
    y += 13;

    (layer.components || []).forEach(comp => {
      const respText = Array.isArray(comp.responsibilities)
        ? comp.responsibilities.join("  ·  ")
        : (comp.responsibilities || "");
      const respLines = d.splitTextToSize(respText, CW - 10);
      const cardH = Math.max(14, 8 + Math.min(respLines.length, 3) * 4);
      y = pageBreakIfNeeded(d, y, cardH + 4);
      card(d, ML, y, CW, cardH, { accent: C.blue });
      setFont(d, "bold", 9.5);
      ink(d, C.navy);
      text(d, comp.component_name || comp.name || "", ML + 5, y + 6);
      if (respText) drawWrap(d, respText, ML + 5, y + 10.5, CW - 10,
                             { size: 8, color: C.gray1, lineH: 4 });
      y += cardH + 3;
    });

    (layer.agents || []).forEach(agent => {
      const cardH = 30;
      y = pageBreakIfNeeded(d, y, cardH + 4);
      card(d, ML, y, CW, cardH, { accent: C.violet });
      setFont(d, "bold", 9);
      fill(d, C.violet);
      d.circle(ML + 8, y + 8, 3.2, "F");
      ink(d, [255, 255, 255]);
      text(d, String(agent.agent_id || "•"), ML + 8, y + 9.5, { align: "center" });
      setFont(d, "bold", 10.5);
      ink(d, C.navy);
      text(d, agent.name || "Agent", ML + 15, y + 7);
      setFont(d, "normal", 8.5);
      ink(d, C.gray1);
      const roleLines = d.splitTextToSize(agent.role || "", CW - 22);
      text(d, roleLines[0] || "", ML + 15, y + 12);

      setFont(d, "bold", 7);
      ink(d, C.gray2);
      text(d, "FRAMEWORK", ML + 5, y + 19);
      setFont(d, "normal", 8.5);
      ink(d, C.ink);
      const fwLines = d.splitTextToSize(agent.reasoning_framework || "—", CW / 2 - 10);
      text(d, fwLines[0] || "—", ML + 5, y + 24);

      setFont(d, "bold", 7);
      ink(d, C.gray2);
      text(d, "MODEL", ML + CW / 2, y + 19);
      setFont(d, "normal", 8.5);
      ink(d, C.ink);
      const modelLines = d.splitTextToSize(agent.model_tier || "—", CW / 2 - 5);
      text(d, modelLines[0] || "—", ML + CW / 2, y + 24);
      y += cardH + 3;
    });

    if (layer.rag_pipeline) {
      y = pageBreakIfNeeded(d, y, 10);
      setFont(d, "bold", 10);
      ink(d, C.navy);
      text(d, "RAG Pipeline Stages", ML, y);
      y += 6;
      layer.rag_pipeline.forEach(stage => {
        y = pageBreakIfNeeded(d, y, 8);
        fill(d, C.accent);
        d.roundedRect(ML, y - 3, 12, 5.5, 1, 1, "F");
        setFont(d, "bold", 7);
        ink(d, [255, 255, 255]);
        text(d, `S${stage.stage}`, ML + 6, y + 0.5, { align: "center" });
        setFont(d, "bold", 9);
        ink(d, C.ink);
        text(d, stage.name || "", ML + 16, y + 0.5);
        if (stage.components?.length) {
          setFont(d, "normal", 7.5);
          ink(d, C.gray2);
          text(d, stage.components.slice(0, 2).join(" · "), ML + 16, y + 4.5);
        }
        y += 9;
      });
    }
    y += 4;
  });
  return y;
}

function renderFrameworks(d, y, fw) {
  const groups = [
    ["Orchestration",    fw.orchestration],
    ["RAG Frameworks",   fw.rag_frameworks],
    ["Guardrails",       fw.guardrails],
    ["Evaluation Tools", fw.evaluation_tools],
    ["Protocols",        fw.protocols],
  ];
  groups.forEach(([label, items]) => {
    if (!items?.length) return;
    y = pageBreakIfNeeded(d, y, 14);
    setFont(d, "bold", 11);
    ink(d, C.navy);
    text(d, label, ML, y);
    hLine(d, ML, y + 2, ML + 50, C.accent, 0.4);
    y += 8;

    items.forEach(item => {
      const desc = item.role || item.purpose || "";
      const dLines = d.splitTextToSize(desc, CW - 10);
      const cardH = Math.max(12, 8 + Math.min(dLines.length, 2) * 4);
      y = pageBreakIfNeeded(d, y, cardH + 3);
      card(d, ML, y, CW, cardH, { accent: C.accent });
      setFont(d, "bold", 9.5);
      ink(d, C.navy);
      text(d, item.name || "", ML + 5, y + 6);
      if (desc) {
        setFont(d, "normal", 8);
        ink(d, C.gray1);
        dLines.slice(0, 2).forEach((ln, li) => text(d, ln, ML + 5, y + 10.5 + li * 4));
      }
      y += cardH + 3;
    });
    y += 3;
  });
  return y;
}

function renderTools(d, y, tools) {
  tools.forEach(tool => {
    const purposeLines = d.splitTextToSize(tool.purpose || "", CW - 50);
    const cardH = Math.max(16, 6 + purposeLines.length * 4.2 + 6);
    y = pageBreakIfNeeded(d, y, cardH + 4);
    card(d, ML, y, CW, cardH, { accent: C.blue });
    setFont(d, "bold", 10);
    ink(d, C.navy);
    text(d, tool.tool_name || tool.name || "", ML + 5, y + 6);
    if (tool.purpose) {
      setFont(d, "normal", 8.5);
      ink(d, C.gray1);
      purposeLines.slice(0, 3).forEach((ln, li) => text(d, ln, ML + 5, y + 11 + li * 4));
    }
    if (tool.invoked_by) {
      setFont(d, "bold", 7);
      const t = `INVOKED BY: ${tool.invoked_by}`;
      const tw = d.getTextWidth(t) + 4;
      rect(d, PW - MR - tw - 5, y + 4, tw, 5, C.accent, 1);
      ink(d, [255, 255, 255]);
      text(d, t, PW - MR - tw / 2 - 5, y + 7.5, { align: "center" });
    }
    y += cardH + 4;
  });
  return y;
}

function renderGuardrails(d, y, rails) {
  const railColor = rt => {
    const s = (rt || "").toLowerCase();
    if (s.includes("input"))     return C.blue;
    if (s.includes("output"))    return C.red;
    if (s.includes("execution")) return C.amber;
    if (s.includes("dialog"))    return C.violet;
    return C.accent;
  };
  rails.forEach(r => {
    const fns = Array.isArray(r.functions) ? r.functions : [];
    const cardH = Math.max(20, 10 + fns.length * 5.2);
    y = pageBreakIfNeeded(d, y, cardH + 4);
    const accent = railColor(r.rail_type);
    card(d, ML, y, CW, cardH, { accent });
    setFont(d, "bold", 10.5);
    ink(d, C.navy);
    text(d, r.rail_type || "", ML + 5, y + 7);
    fns.forEach((fn, fi) => {
      const fy = y + 13 + fi * 5;
      fill(d, accent);
      d.circle(ML + 6, fy - 1.2, 0.7, "F");
      setFont(d, "normal", 8.5);
      ink(d, C.gray1);
      const fnLines = d.splitTextToSize(fn, CW - 14);
      text(d, fnLines[0] || "", ML + 10, fy);
    });
    y += cardH + 4;
  });
  return y;
}

function renderMemory(d, y, mems) {
  mems.forEach(mem => {
    const contents = Array.isArray(mem.contents) ? mem.contents : [];
    const cardH = Math.max(28, 12 + contents.length * 4.5 + 6);
    y = pageBreakIfNeeded(d, y, cardH + 4);
    card(d, ML, y, CW, cardH, { accent: C.violet });
    setFont(d, "bold", 11);
    ink(d, C.navy);
    text(d, mem.memory_type || "", ML + 5, y + 7);
    contents.forEach((c, i) => {
      const cy = y + 14 + i * 4.5;
      fill(d, C.violet);
      d.circle(ML + 6, cy - 1.2, 0.7, "F");
      setFont(d, "normal", 8.5);
      ink(d, C.gray1);
      text(d, String(c), ML + 10, cy);
    });
    const storage = Array.isArray(mem.storage) ? mem.storage.join(", ") : (mem.storage || "");
    if (storage) {
      const sy = y + cardH - 5;
      setFont(d, "bold", 7);
      ink(d, C.gray2);
      text(d, "STORAGE:", ML + 5, sy);
      setFont(d, "normal", 8);
      ink(d, C.ink);
      text(d, storage, ML + 22, sy);
    }
    y += cardH + 4;
  });
  return y;
}

/** Tech stack — FIXED: values rendered ONCE only */
function renderTechStack(d, y, stack) {
  Object.entries(stack).forEach(([k, v]) => {
    const values = Array.isArray(v) ? v : [String(v)];
    const valueStr = values.join("  ·  ");
    const valLines = d.splitTextToSize(valueStr, CW - 55);
    const cardH = Math.max(12, 6 + valLines.length * 4.2);
    y = pageBreakIfNeeded(d, y, cardH + 3);
    card(d, ML, y, CW, cardH, { accent: C.accent, fillC: C.surface });

    setFont(d, "bold", 8);
    ink(d, C.accent);
    text(d, k.replace(/_/g, " ").toUpperCase(), ML + 5, y + 6);

    setFont(d, "normal", 9);
    ink(d, C.ink);
    valLines.slice(0, 3).forEach((ln, li) => text(d, ln, ML + 50, y + 6 + li * 4.2));

    y += cardH + 3;
  });
  return y;
}

/** Metrics — FIXED: target text wraps inside card */
function renderMetrics(d, y, metrics) {
  const cols = 2;
  const gap = 4;
  const mw = (CW - gap) / cols;

  for (let i = 0; i < metrics.length; i += cols) {
    const left  = metrics[i];
    const right = metrics[i + 1];
    const leftTargetLines  = d.splitTextToSize(left?.target  || "—", mw - 10).length;
    const rightTargetLines = right ? d.splitTextToSize(right.target || "—", mw - 10).length : 0;
    const lines = Math.max(leftTargetLines, rightTargetLines, 1);
    const rowH = 14 + lines * 5.5;
    y = pageBreakIfNeeded(d, y, rowH + 4);

    const drawC = (data, x) => {
      if (!data) return;
      card(d, x, y, mw, rowH, { accent: C.accent, fillC: C.surface });
      setFont(d, "bold", 7.5);
      ink(d, C.accent);
      text(d, (data.metric || "").toUpperCase(), x + 5, y + 7);
      setFont(d, "bold", 11);
      ink(d, C.navy);
      const targetLines = d.splitTextToSize(data.target || "—", mw - 10);
      targetLines.forEach((ln, li) => text(d, ln, x + 5, y + 14 + li * 5.5));
    };
    drawC(left,  ML);
    drawC(right, ML + mw + gap);
    y += rowH + gap;
  }
  return y;
}

function renderWorkflows(d, y, workflows) {
  workflows.forEach((wf, i) => {
    y = pageBreakIfNeeded(d, y, 14);
    card(d, ML, y, CW, 12, { accent: C.accent });
    setFont(d, "bold", 9);
    fill(d, C.accent);
    d.circle(ML + 8, y + 6, 3.2, "F");
    ink(d, [255, 255, 255]);
    text(d, String(i + 1), ML + 8, y + 7.5, { align: "center" });
    setFont(d, "bold", 10);
    ink(d, C.navy);
    text(d, wf.workflow_name || wf.name || "", ML + 16, y + 7.5);
    y += 16;
  });
  return y;
}

function renderReportStructure(d, y, items) {
  items.forEach((item, i) => {
    y = pageBreakIfNeeded(d, y, 10);
    setFont(d, "bold", 9);
    ink(d, C.accent);
    text(d, String(i + 1).padStart(2, "0"), ML + 3, y + 1);
    setFont(d, "normal", 10);
    ink(d, C.ink);
    text(d, item, ML + 15, y + 1);
    y += 8;
  });
  return y;
}

/* ─── Section router ────────────────────────────────────────────────── */
function drawSection(d, section, secIndex) {
  let y = startContentPage(d);
  const number = section.section_number || section.section_no || (secIndex + 1);
  y = sectionTitle(d, y, number, section.title);

  if (section.subsections) {
    section.subsections.forEach(sub => {
      y = subTitle(d, y, sub.section_number, sub.title);
      if (sub.principles) y = renderPrinciples(d, y, sub.principles);
      if (sub.categories) y = renderCategories(d, y, sub.categories);
      if (sub.content)    y = renderContentObject(d, y, sub.content);
    });
  }
  if (section.architecture_layers) y = renderArchitectureLayers(d, y, section.architecture_layers);
  if (section.frameworks)          y = renderFrameworks(d, y, section.frameworks);
  if (section.tools)               y = renderTools(d, y, section.tools);
  if (section.guardrails)          y = renderGuardrails(d, y, section.guardrails);
  if (section.memory_architecture) {
    y = renderMemory(d, y, section.memory_architecture);
    if (section.critical_practices?.length) {
      y = pageBreakIfNeeded(d, y, 12);
      setFont(d, "bold", 11);
      ink(d, C.navy);
      text(d, "Critical Practices", ML, y);
      hLine(d, ML, y + 2, ML + 50, C.accent, 0.4);
      y += 8;
      section.critical_practices.forEach(cp => {
        y = pageBreakIfNeeded(d, y, 7);
        fill(d, C.accent);
        d.circle(ML + 2, y - 1.2, 0.7, "F");
        y = drawWrap(d, cp, ML + 6, y, CW - 6, { size: 9, color: C.ink, lineH: 4.5 }) + 2;
      });
    }
  }
  if (section.stack)            y = renderTechStack(d, y, section.stack);
  if (section.metrics)          y = renderMetrics(d, y, section.metrics);
  if (section.workflows)        y = renderWorkflows(d, y, section.workflows);
  if (section.report_structure) y = renderReportStructure(d, y, section.report_structure);
  if (section.content && typeof section.content === "object" && !Array.isArray(section.content)) {
    y = renderContentObject(d, y, section.content);
  }
}

/* ─── Footers ───────────────────────────────────────────────────────── */
function drawFooters(d, options) {
  const { skipPages = new Set() } = options;
  const total = d.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    if (skipPages.has(p)) continue;
    d.setPage(p);
    const pgw = d.internal.pageSize.getWidth();
    const pgh = d.internal.pageSize.getHeight();
    rect(d, 0, pgh - FOOTER_H, pgw, FOOTER_H, C.navy);
    setFont(d, "normal", 7);
    ink(d, [255, 255, 255]);
    text(d, "AgentForgeX  ·  Confidential — AI-Generated Technical Design", 18, pgh - 4);
    setFont(d, "bold", 7);
    text(d, `Page ${p} of ${total}`, pgw - 18, pgh - 4, { align: "right" });
  }
}

/* ─── MAIN EXPORT ───────────────────────────────────────────────────── */
export async function generatePDF(data, title = "Technical_Design", flowData = null) {
  const d = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const customFooterPages = new Set();

  // 1. Cover
  drawCover(d, data, title);
  customFooterPages.add(1);

  // 2. Reserve TOC page
  d.addPage();
  drawPageBg(d);
  drawPageHeader(d);

  // 3. Swimlane workflow (landscape)
  drawSwimlaneWorkflowPage(d, flowData);
  customFooterPages.add(3);

  // 4..N. Sections
  const sectionStartPages = [];
  (data.sections || []).forEach((section, i) => {
    d.addPage();
    sectionStartPages.push(d.getNumberOfPages());
    drawSection(d, section, i);
  });

  // Now render TOC on the reserved page 2
  d.setPage(2);
  drawTOC(d, data, sectionStartPages);

  // Footers everywhere except cover & workflow
  drawFooters(d, { skipPages: customFooterPages });

  const safe = String(title).replace(/[^\w\d]+/g, "_").slice(0, 80);
  d.save(`${safe}_Technical_Design.pdf`);
}
