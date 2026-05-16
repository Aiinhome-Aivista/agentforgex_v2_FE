/**
 * processPdfGenerator.js — AgentForgeX Process Analysis Report
 * 
 * Native jsPDF programmatic rendering. Zero html2canvas.
 * Tailored for Process Analysis data structure:
 * { process, steps, suggestions, erp_modules, key_insights, top_automation_targets }
 */

import jsPDF from "jspdf";

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
  text(d, "Process Analysis Report", PW - MR, 14.5, { align: "right" });
  hLine(d, ML, 17, PW - MR, C.border, 0.2);
}
function drawPageFooter(d) {
  const pNum = d.internal.getNumberOfPages();
  setFont(d, "normal", 8);
  ink(d, C.gray3);
  text(d, `Page ${pNum}`, PW - MR, PH - 10, { align: "right" });
  text(d, "Confidential - AgentForgeX Process Intelligence", ML, PH - 10);
}
function pageBreakIfNeeded(d, y, needed) {
  if (y + needed > PH - MBot - 10) {
    drawPageFooter(d);
    d.addPage("a4", "portrait");
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

/* ─── Section header ────────────────────────────── */
function sectionTitle(d, y, title) {
  y = pageBreakIfNeeded(d, y, 15);
  setFont(d, "bold", 14);
  ink(d, C.navy);
  text(d, title || "Section", ML, y + 4);
  hLine(d, ML, y + 7, PW - MR, C.accent, 0.5);
  return y + 12;
}

/* ─── COVER ──────────────────────────────────────────────────────────── */
function drawCover(d, data) {
  drawPageBg(d);
  const process = data.process || {};

  rect(d, 0, 0, PW, 6, C.accent);
  rect(d, 0, 6, PW, 0.5, C.accentDk);

  setFont(d, "bold", 12);
  ink(d, C.navy);
  text(d, "AgentForgeX", ML, 22);
  setFont(d, "normal", 8);
  ink(d, C.gray2);
  text(d, "PROCESS INTELLIGENCE REPORT", ML + 28, 22);

  setFont(d, "bold", 9);
  ink(d, C.accent);
  text(d, "AUTOMATION ANALYSIS", ML, 80);

  const title = process.title || "Process Analysis";
  setFont(d, "bold", 26);
  ink(d, C.navy);
  const titleLines = d.splitTextToSize(title, CW - 4);
  titleLines.slice(0, 4).forEach((ln, i) => text(d, ln, ML, 96 + i * 11));

  const subY = 96 + Math.min(titleLines.length, 4) * 11 + 6;
  if (process.description) {
    setFont(d, "normal", 11);
    ink(d, C.gray1);
    const subLines = d.splitTextToSize(process.description, CW - 4);
    subLines.slice(0, 3).forEach((ln, i) => text(d, ln, ML, subY + i * 6));
  }

  rect(d, ML, 175, CW, 0.6, C.accent);

  const meta = [
    ["DATE",             new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    ["SYSTEM",           process.erp_system || "Enterprise"],
    ["SCORE",            `${Math.round(process.automation_score || 0)}%`],
    ["CLASSIFICATION",   "Confidential"],
  ];
  const colW = CW / 2;
  meta.forEach(([label, val], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = ML + col * colW, y = 185 + row * 22;
    setFont(d, "bold", 8);
    ink(d, C.accent); // Restore label in green
    text(d, label, x, y);
    setFont(d, "bold", 15);
    ink(d, label === "SCORE" ? C.accent : C.navy); // Emerald for score value
    text(d, String(val), x, y + 8);
  });

  rect(d, 0, PH - 14, PW, 14, C.navy);
  setFont(d, "normal", 8);
  ink(d, [255, 255, 255]);
  text(d, "Generated by AgentForgeX  ·  AI-Powered Process Mining Platform", ML, PH - 5);
  setFont(d, "bold", 8);
  text(d, "Page 1", PW - MR, PH - 5, { align: "right" });
}

/* ─── Main Export ────────────────────────────────────────────────────── */
export async function generateProcessPDF(data) {
  const d = new jsPDF("p", "mm", "a4");
  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = data;

  // Cover
  drawCover(d, data);

  // Content starts
  d.addPage("a4", "portrait");
  let y = startContentPage(d);

  // 1. Key Insights
  y = sectionTitle(d, y, "Key Process Insights");
  if (key_insights?.length) {
    key_insights.forEach((insight, i) => {
      y = pageBreakIfNeeded(d, y, 12);
      setFont(d, "bold", 10);
      ink(d, C.accent);
      text(d, `0${i + 1}.`, ML, y);
      
      setFont(d, "bold", 9.5);
      ink(d, C.navy);
      const txt = insight.text || "";
      const lines = d.splitTextToSize(txt, CW - 12);
      lines.forEach((ln, li) => text(d, ln, ML + 10, y + li * 5));
      
      y += lines.length * 5;
      setFont(d, "bold", 7);
      ink(d, C.gray2);
      text(d, `${(insight.category || "").toUpperCase()} · ${(insight.impact || "").toUpperCase()} IMPACT`, ML + 10, y);
      y += 8;
    });
  }
  y += 5;

  // 2. Top Automation Targets (Table)
  y = sectionTitle(d, y, "Top Automation Targets");
  const headers = ["Rank", "Title / Process", "Actor", "Potential"];
  const colWidths = [15, 80, 50, 30];
  const startX = ML;
  
  // Draw header row
  y = pageBreakIfNeeded(d, y, 10);
  rect(d, startX, y, CW, 8, C.surface);
  setFont(d, "bold", 8);
  ink(d, C.gray1);
  let curX = startX;
  headers.forEach((h, i) => {
    text(d, h, curX + 2, y + 5.5);
    curX += colWidths[i];
  });
  y += 8;

  if (top_automation_targets?.length) {
    top_automation_targets.forEach((t, i) => {
      y = pageBreakIfNeeded(d, y, 10);
      curX = startX;
      setFont(d, "normal", 9);
      ink(d, C.ink);
      
      text(d, String(i + 1), curX + 2, y + 6);
      curX += colWidths[0];
      
      setFont(d, "bold", 9);
      text(d, t.title || "", curX + 2, y + 6);
      curX += colWidths[1];
      
      setFont(d, "normal", 9);
      text(d, t.actor || "", curX + 2, y + 6);
      curX += colWidths[2];
      
      setFont(d, "bold", 9);
      ink(d, C.accent);
      text(d, `${t.automation_potential}%`, curX + 2, y + 6);
      
      hLine(d, ML, y + 9, PW - MR, C.border, 0.1);
      y += 9;
    });
  }
  y += 10;

  // 3. Process Step Breakdown
  y = sectionTitle(d, y, "Process Step Breakdown");
  if (steps?.length) {
    steps.forEach((step, i) => {
      const descLines = d.splitTextToSize(step.description || "", CW - 30);
      const cardH = 20 + descLines.length * 5;
      y = pageBreakIfNeeded(d, y, cardH + 5);
      
      // Timeline dot and line
      stroke(d, C.gray4);
      d.setLineWidth(0.5);
      if (i < steps.length - 1) {
        d.line(ML + 5, y + 5, ML + 5, y + cardH + 5);
      }
      fill(d, C.gray2);
      d.circle(ML + 5, y + 5, 1.5, "F");

      // Card
      const cardX = ML + 12;
      rect(d, cardX, y, CW - 12, cardH, C.surface, 2);
      strokeRect(d, cardX, y, CW - 12, cardH, C.border, 0.2, 2);
      
      setFont(d, "bold", 11);
      ink(d, C.navy);
      text(d, step.title || "", cardX + 5, y + 8);
      
      const badgeText = `${step.automation_potential}% POTENTIAL`;
      const bw = d.getTextWidth(badgeText) + 6;
      rect(d, PW - MR - bw - 2, y + 4, bw, 6, C.accent, 1);
      setFont(d, "bold", 7);
      ink(d, [255, 255, 255]);
      text(d, badgeText, PW - MR - bw/2 - 2, y + 8.2, { align: "center" });

      setFont(d, "bold", 7);
      ink(d, C.accentDk);
      text(d, `${(step.actor || "").toUpperCase()} · ${(step.step_type || "").toUpperCase()}`, cardX + 5, y + 13);

      setFont(d, "normal", 9);
      ink(d, C.ink);
      descLines.forEach((ln, li) => text(d, ln, cardX + 5, y + 19 + li * 5));
      
      y += cardH + 5;
    });
  }

  // 4. ERP Context
  y = sectionTitle(d, y, "System & Module Inventory");
  if (erp_modules?.length) {
    erp_modules.forEach((mod) => {
      y = pageBreakIfNeeded(d, y, 40);
      
      rect(d, ML, y, 2, 25, C.accent);
      setFont(d, "bold", 11);
      ink(d, C.navy);
      text(d, mod.module_name || "", ML + 5, y + 5);
      
      setFont(d, "normal", 8);
      ink(d, C.gray2);
      text(d, mod.source_file || "", PW - MR, y + 5, { align: "right" });
      
      y += 10;
      setFont(d, "normal", 9);
      ink(d, C.gray1);
      const descLines = d.splitTextToSize(mod.description || "", CW - 10);
      descLines.forEach((ln, li) => text(d, ln, ML + 5, y + li * 4.5));
      y += descLines.length * 4.5 + 4;
      
      setFont(d, "bold", 7);
      ink(d, C.gray3);
      text(d, "ENTITIES", ML + 5, y);
      setFont(d, "normal", 8);
      ink(d, C.ink);
      text(d, mod.tables_identified?.join(", ") || "None", ML + 5, y + 4);
      y += 9;
    });
  } else {
    setFont(d, "italic", 9);
    ink(d, C.gray3);
    text(d, "No ERP modules identified.", ML, y);
    y += 10;
  }

  // 5. Automation Suggestions
  y = sectionTitle(d, y, `${suggestions?.length || 0} Automation Opportunities Identified`);
  if (suggestions?.length) {
    suggestions.forEach((s) => {
      const descLines = d.splitTextToSize(s.description || "", CW - 10);
      const cardH = 35 + descLines.length * 4.5;
      y = pageBreakIfNeeded(d, y, cardH + 5);
      
      strokeRect(d, ML, y, CW, cardH, C.border, 0.2, 2);
      rect(d, ML, y, 1.5, cardH, C.accent);
      
      setFont(d, "bold", 10.5);
      ink(d, C.navy);
      text(d, s.title || "", ML + 5, y + 7);
      
      setFont(d, "bold", 7);
      ink(d, C.gray2);
      text(d, (s.agent_type || "").replace("_", " ").toUpperCase(), PW - MR - 2, y + 7, { align: "right" });
      
      y += 12;
      setFont(d, "normal", 9);
      ink(d, C.ink);
      descLines.forEach((ln, li) => text(d, ln, ML + 5, y + li * 4.5));
      y += descLines.length * 4.5 + 5;
      
      hLine(d, ML + 5, y, PW - MR - 5, C.border, 0.1);
      y += 6;
      
      const metrics = [
        ["ROI Impact", s.roi_impact],
        ["Effort", s.effort_level],
        ["Accuracy", `${s.accuracy_estimate}%`]
      ];
      metrics.forEach((m, mi) => {
        setFont(d, "bold", 7);
        ink(d, C.gray3);
        text(d, m[0].toUpperCase(), ML + 5 + mi * 50, y);
        setFont(d, "bold", 9);
        ink(d, mi === 0 ? C.accent : mi === 1 ? C.amber : C.navy);
        text(d, String(m[1]), ML + 5 + mi * 50, y + 4.5);
      });
      
      y += 12;
    });
  }

  drawPageFooter(d);
  d.save(`${(process.title || "Process").replace(/\s+/g, "_")}_Report.pdf`);
}
