/**
 * pdfGenerator.js
 * Native jsPDF vector/text rendering — zero html2canvas, zero PNG bloat.
 * Target: < 3 MB for a full technical design document.
 */

import jsPDF from "jspdf";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        [8,   12,  20],   // near-black
  surface:   [14,  20,  34],   // card bg
  accent:    [16,  185, 129],  // brand green (#10b981)
  accentDim: [10,  110, 76],   // darker green
  white:     [255, 255, 255],
  gray1:     [220, 225, 235],  // headings
  gray2:     [160, 170, 185],  // sub-text
  gray3:     [80,  90,  108],  // muted
  border:    [30,  40,  60],
  red:       [239, 68,  68],
  amber:     [245, 158, 11],
  yellow:    [234, 179, 8],
  blue:      [59,  130, 246],
};

const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const ML = 18;  // margin left
const MR = 18;  // margin right
const CW = PW - ML - MR; // content width

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgb(doc, color) { doc.setTextColor(...color); }
function fill(doc, color) { doc.setFillColor(...color); }
function stroke(doc, color) { doc.setDrawColor(...color); }

function rect(doc, x, y, w, h, color, radius = 0) {
  fill(doc, color);
  if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, "F");
  else doc.rect(x, y, w, h, "F");
}

function line(doc, x1, y1, x2, y2, color, lw = 0.3) {
  stroke(doc, color);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function text(doc, str, x, y, opts = {}) {
  if (!str && str !== 0) return;
  doc.text(String(str), x, y, opts);
}

function setFont(doc, style = "normal", size = 10) {
  doc.setFontSize(size);
  doc.setFont("helvetica", style);
}

/** Wraps long text and returns new Y after writing */
function wrappedText(doc, str, x, y, maxW, size = 10, color = C.gray1, style = "normal", lineH = 5.5) {
  if (!str) return y;
  setFont(doc, style, size);
  rgb(doc, color);
  const lines = doc.splitTextToSize(String(str), maxW);
  lines.forEach((ln, i) => text(doc, ln, x, y + i * lineH));
  return y + lines.length * lineH;
}

/** Draw a pill/badge */
function badge(doc, label, x, y, bg = C.accent, fg = C.bg, size = 7) {
  setFont(doc, "bold", size);
  const w = doc.getTextWidth(label) + 6;
  rect(doc, x, y - 4, w, 5.5, bg, 2);
  rgb(doc, fg);
  text(doc, label, x + 3, y);
  return x + w + 3;
}

/** Section header with green left bar */
function sectionHeader(doc, title, y) {
  rect(doc, ML, y, 3, 7, C.accent, 1);
  setFont(doc, "bold", 14);
  rgb(doc, C.white);
  text(doc, title, ML + 6, y + 5.5);
  return y + 13;
}

/** Horizontal rule */
function hr(doc, y, color = C.border) {
  line(doc, ML, y, PW - MR, y, color, 0.2);
  return y + 4;
}

/** Card background */
function card(doc, x, y, w, h) {
  rect(doc, x, y, w, h, C.surface, 3);
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 3, 3, "S");
}

/** Check if page break needed */
function checkPage(doc, y, needed = 20) {
  if (y + needed > PH - 15) {
    doc.addPage();
    drawPageBg(doc);
    return 20;
  }
  return y;
}

function drawPageBg(doc) {
  fill(doc, C.bg);
  doc.rect(0, 0, PW, PH, "F");
  // subtle corner accent
  fill(doc, C.accentDim);
  doc.rect(0, 0, 3, PH, "F");
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function drawCover(doc, data) {
  const cp = data.cover_page || data.document_metadata || {};

  // Full dark background
  fill(doc, C.bg);
  doc.rect(0, 0, PW, PH, "F");

  // Gradient-like layered rectangles (top right glow)
  fill(doc, [16, 185, 129, 0.08]);
  doc.setFillColor(16, 185, 129);
  doc.setGState(new doc.GState({ opacity: 0.06 }));
  doc.ellipse(PW + 10, -10, 80, 80, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Left accent bar
  rect(doc, 0, 0, 4, PH, C.accent);

  // Top bar
  rect(doc, 0, 0, PW, 18, C.surface);
  setFont(doc, "bold", 11);
  rgb(doc, C.accent);
  text(doc, "⚡ AgentForgeX", 12, 12);
  setFont(doc, "normal", 8);
  rgb(doc, C.gray3);
  text(doc, "POWERED BY AGENTIC AI", PW - MR - 42, 12);

  // Confidential badge
  stroke(doc, C.accent);
  doc.setLineWidth(0.4);
  doc.roundedRect(PW - MR - 32, 6, 30, 7, 3, 3, "S");
  setFont(doc, "bold", 6.5);
  rgb(doc, C.accent);
  text(doc, "CONFIDENTIAL", PW - MR - 28, 11.5);

  // Doc type label
  const docType = cp.document_type || "Technical Design Document";
  setFont(doc, "bold", 9);
  rgb(doc, C.accent);
  text(doc, docType.toUpperCase(), ML + 4, 65);

  // Main title
  const title = cp.title || "Agentic AI Technical Design";
  setFont(doc, "bold", 22);
  rgb(doc, C.white);
  const titleLines = doc.splitTextToSize(title, CW - 10);
  titleLines.forEach((ln, i) => text(doc, ln, ML + 4, 80 + i * 12));

  // Subtitle
  if (cp.subtitle) {
    const subY = 80 + titleLines.length * 12 + 8;
    setFont(doc, "normal", 12);
    rgb(doc, C.gray2);
    text(doc, cp.subtitle, ML + 4, subY);
  }

  // Decorative horizontal accent line
  const lineY = 155;
  rect(doc, ML, lineY, CW, 1, C.accent);

  // Metadata grid
  const meta = [
    ["Date",         cp.date || "2026"],
    ["Version",      cp.version || "Draft V1.0"],
    ["Organization", cp.organization || "PwC"],
    ["Classification", "Confidential"],
  ];
  const colW = CW / 2;
  meta.forEach(([label, val], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = ML + col * colW;
    const by = lineY + 10 + row * 18;
    setFont(doc, "bold", 7);
    rgb(doc, C.accent);
    text(doc, label.toUpperCase(), bx + 4, by);
    setFont(doc, "normal", 10);
    rgb(doc, C.white);
    text(doc, val, bx + 4, by + 6);
  });

  // Bottom footer
  rect(doc, 0, PH - 16, PW, 16, C.surface);
  setFont(doc, "normal", 7);
  rgb(doc, C.gray3);
  text(doc, "Generated by AgentForgeX  |  AI-Powered Technical Design Platform", ML + 4, PH - 7);
  text(doc, "Page 1", PW - MR - 10, PH - 7);
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function drawTOC(doc, sections) {
  drawPageBg(doc);
  let y = 20;

  // Header
  rect(doc, ML, y, CW, 14, C.surface, 3);
  setFont(doc, "bold", 15);
  rgb(doc, C.white);
  text(doc, "Table of Contents", ML + 6, y + 10);
  rect(doc, ML, y + 13, CW, 0.5, C.accent);
  y += 22;

  const toc = sections || [];
  toc.forEach((sec, i) => {
    y = checkPage(doc, y, 12);
    const num = String(sec.section_number || sec.section_no || i + 1).padStart(2, "0");
    const title = sec.title || "";
    const page = sec.page || "";

    // alternating row
    if (i % 2 === 0) rect(doc, ML, y - 4, CW, 9, [18, 25, 42], 2);

    setFont(doc, "bold", 9);
    rgb(doc, C.accent);
    text(doc, num, ML + 4, y + 1);

    setFont(doc, "normal", 9);
    rgb(doc, C.gray1);
    text(doc, title, ML + 16, y + 1);

    if (page) {
      setFont(doc, "bold", 9);
      rgb(doc, C.gray2);
      text(doc, String(page), PW - MR - 8, y + 1);
    }

    // dotted line
    stroke(doc, C.border);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([1, 2], 0);
    const titleW = doc.getTextWidth(title);
    doc.line(ML + 18 + titleW + 2, y, PW - MR - 14, y);
    doc.setLineDashPattern([], 0);

    y += 10;
  });
}

// ─── Agentic Workflow section ─────────────────────────────────────────────────

function drawWorkflow(doc, y) {
  y = checkPage(doc, y, 90);
  y = sectionHeader(doc, "Agentic Process Workflow", y);

  const stages = [
    { icon: "📥", label: "Input\nCollection",   color: C.blue },
    { icon: "⚙️", label: "Data\nProcessing",    color: [139, 92, 246] },
    { icon: "🧠", label: "AI\nAnalysis",         color: C.accent },
    { icon: "🤝", label: "Multi-Agent\nCollab",  color: [236, 72, 153] },
    { icon: "✅", label: "Validation",            color: C.amber },
    { icon: "📄", label: "Design\nGeneration",   color: [14, 165, 233] },
    { icon: "🚀", label: "Final\nOutput",         color: C.accent },
  ];

  const nodeW = 22;
  const nodeH = 20;
  const gap = (CW - stages.length * nodeW) / (stages.length - 1);
  const rowY = y + 8;

  stages.forEach((s, i) => {
    const nx = ML + i * (nodeW + gap);

    // connector arrow
    if (i < stages.length - 1) {
      const ax = nx + nodeW + 1;
      const ay = rowY + nodeH / 2;
      stroke(doc, C.gray3);
      doc.setLineWidth(0.5);
      doc.line(ax, ay, ax + gap - 2, ay);
      // arrowhead
      fill(doc, C.gray3);
      doc.triangle(ax + gap - 2, ay - 1.5, ax + gap - 2, ay + 1.5, ax + gap + 1, ay, "F");
    }

    // node card
    rect(doc, nx, rowY, nodeW, nodeH, C.surface, 3);
    stroke(doc, s.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(nx, rowY, nodeW, nodeH, 3, 3, "S");

    // top color bar
    rect(doc, nx, rowY, nodeW, 3, s.color, 2);

    // icon (use text emoji fallback)
    setFont(doc, "normal", 9);
    rgb(doc, C.white);
    text(doc, s.icon.replace(/\uFE0F/g, ""), nx + nodeW / 2, rowY + 10, { align: "center" });

    // label
    setFont(doc, "bold", 5.5);
    rgb(doc, C.gray1);
    const lblLines = s.label.split("\n");
    lblLines.forEach((ln, li) => text(doc, ln, nx + nodeW / 2, rowY + 14 + li * 4, { align: "center" }));
  });

  // Operating model label
  y = rowY + nodeH + 8;
  setFont(doc, "normal", 7);
  rgb(doc, C.gray3);
  text(doc, "Operating Model: Hierarchical Orchestrator  |  Reasoning: Plan-and-Execute + ReAct", ML, y);
  return y + 10;
}

// ─── Generic section content renderer ────────────────────────────────────────

function renderValue(doc, val, x, y, maxW) {
  if (val === null || val === undefined || val === "") return y;

  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return wrappedText(doc, String(val), x, y, maxW, 9, C.gray1, "normal", 5.2) + 3;
  }

  if (Array.isArray(val)) {
    val.forEach((item) => {
      if (typeof item === "string" || typeof item === "number") {
        y = checkPage(doc, y, 8);
        // bullet
        fill(doc, C.accent);
        doc.circle(x + 1.5, y - 1.5, 1, "F");
        y = wrappedText(doc, String(item), x + 6, y, maxW - 6, 8.5, C.gray1, "normal", 5) + 2;
      } else if (typeof item === "object") {
        y = checkPage(doc, y, 12);
        // find a title key
        const titleKey = ["name", "title", "type", "rail_type", "memory_type", "workflow_name", "metric", "tool_name", "component_name"].find((k) => item[k]);
        if (titleKey) {
          setFont(doc, "bold", 9);
          rgb(doc, C.accent);
          text(doc, String(item[titleKey]), x + 4, y);
          y += 6;
        }
        Object.entries(item).forEach(([k, v]) => {
          if (k === titleKey || ["id", "agent_id", "layer_id", "section_number", "section_no"].includes(k)) return;
          y = checkPage(doc, y, 8);
          setFont(doc, "bold", 7.5);
          rgb(doc, C.gray3);
          text(doc, k.replace(/_/g, " ").toUpperCase() + ":", x + 4, y);
          y = renderValue(doc, v, x + 4, y + 4, maxW - 8);
        });
        y += 3;
        line(doc, x, y, x + maxW, y, C.border, 0.15);
        y += 4;
      }
    });
    return y;
  }

  if (typeof val === "object") {
    Object.entries(val).forEach(([k, v]) => {
      y = checkPage(doc, y, 10);
      setFont(doc, "bold", 8);
      rgb(doc, C.gray2);
      text(doc, k.replace(/_/g, " ") + ":", x, y);
      y = renderValue(doc, v, x + 4, y + 5, maxW - 4);
    });
    return y;
  }

  return y;
}

function drawSection(doc, section, secIndex) {
  drawPageBg(doc);
  let y = 20;

  // Section number + title
  const num = String(section.section_number || section.section_no || secIndex + 1).padStart(2, "0");
  setFont(doc, "bold", 30);
  rgb(doc, C.accentDim);
  text(doc, num, ML, y + 12);
  setFont(doc, "bold", 16);
  rgb(doc, C.white);
  text(doc, section.title || "Section", ML + 22, y + 12);
  rect(doc, ML + 22, y + 15, CW - 22, 0.5, C.accent);
  y += 24;

  // Handle architecture_layers (Section 3)
  if (section.architecture_layers) {
    section.architecture_layers.forEach((layer) => {
      y = checkPage(doc, y, 20);
      rect(doc, ML, y, CW, 10, C.surface, 2);
      setFont(doc, "bold", 11);
      rgb(doc, C.accent);
      text(doc, `Layer ${layer.layer_id}: ${layer.name}`, ML + 4, y + 7);
      y += 14;

      if (layer.agents) {
        layer.agents.forEach((agent) => {
          y = checkPage(doc, y, 30);
          card(doc, ML, y, CW, 28);
          setFont(doc, "bold", 9.5);
          rgb(doc, C.white);
          text(doc, `Agent ${agent.agent_id}: ${agent.name}`, ML + 4, y + 7);
          setFont(doc, "italic", 8);
          rgb(doc, C.accent);
          text(doc, agent.role || "", ML + 4, y + 13);
          setFont(doc, "bold", 7);
          rgb(doc, C.gray3);
          text(doc, "Framework: ", ML + 4, y + 19);
          setFont(doc, "normal", 7);
          rgb(doc, C.gray2);
          text(doc, agent.reasoning_framework || "—", ML + 24, y + 19);
          setFont(doc, "bold", 7);
          rgb(doc, C.gray3);
          text(doc, "Model: ", ML + 4, y + 24);
          setFont(doc, "normal", 7);
          rgb(doc, C.gray2);
          const model = doc.splitTextToSize(agent.model_tier || "—", CW - 25);
          text(doc, model[0] || "", ML + 18, y + 24);
          y += 32;
        });
      }

      if (layer.components) {
        layer.components.forEach((comp) => {
          y = checkPage(doc, y, 18);
          card(doc, ML, y, CW, 16);
          setFont(doc, "bold", 9);
          rgb(doc, C.white);
          text(doc, comp.component_name || comp.name || "", ML + 4, y + 6);
          if (comp.responsibilities) {
            setFont(doc, "normal", 7.5);
            rgb(doc, C.gray2);
            const resp = doc.splitTextToSize(comp.responsibilities.slice(0, 2).join("  •  "), CW - 10);
            text(doc, resp[0] || "", ML + 4, y + 11);
          }
          y += 20;
        });
      }

      if (layer.rag_pipeline) {
        y = checkPage(doc, y, 12);
        setFont(doc, "bold", 9);
        rgb(doc, C.gray2);
        text(doc, "RAG Pipeline Stages:", ML, y);
        y += 6;
        layer.rag_pipeline.forEach((stage) => {
          y = checkPage(doc, y, 8);
          badge(doc, `Stage ${stage.stage}`, ML, y, C.surface, C.accent, 7);
          setFont(doc, "normal", 8);
          rgb(doc, C.gray1);
          text(doc, stage.name, ML + 18, y);
          y += 7;
        });
      }
    });
    return;
  }

  // Handle subsections
  if (section.subsections) {
    section.subsections.forEach((sub) => {
      y = checkPage(doc, y, 16);
      setFont(doc, "bold", 10);
      rgb(doc, C.white);
      rect(doc, ML, y - 3, 3, 8, C.accent, 1);
      text(doc, `${sub.section_number || ""} ${sub.title}`, ML + 6, y + 3);
      y += 10;

      if (sub.principles) {
        sub.principles.forEach((p) => {
          y = checkPage(doc, y, 20);
          card(doc, ML, y, CW, 18);
          badge(doc, String(p.id || ""), ML + 4, y + 7, C.accent, C.bg, 7);
          setFont(doc, "bold", 9);
          rgb(doc, C.white);
          text(doc, p.name || "", ML + 14, y + 7);
          y = wrappedText(doc, p.application || "", ML + 6, y + 12, CW - 10, 7.5, C.gray2, "normal", 4.5);
          y += 4;
        });
      }

      if (sub.categories) {
        sub.categories.forEach((cat) => {
          y = checkPage(doc, y, 16);
          card(doc, ML, y, CW, 14);
          setFont(doc, "bold", 9);
          rgb(doc, C.accent);
          text(doc, cat.type || "", ML + 4, y + 6);
          y = wrappedText(doc, cat.description || "", ML + 4, y + 11, CW - 10, 8, C.gray2, "normal", 4.5);
          y += 3;
        });
      }
      y += 4;
    });
    return;
  }

  // Handle frameworks section
  if (section.frameworks) {
    const fw = section.frameworks;
    const groups = [
      ["Orchestration",    fw.orchestration],
      ["RAG Frameworks",   fw.rag_frameworks],
      ["Guardrails",       fw.guardrails],
      ["Evaluation Tools", fw.evaluation_tools],
      ["Protocols",        fw.protocols],
    ];
    groups.forEach(([label, items]) => {
      if (!items?.length) return;
      y = checkPage(doc, y, 14);
      setFont(doc, "bold", 9);
      rgb(doc, C.gray2);
      text(doc, label, ML, y);
      y += 6;
      items.forEach((item) => {
        y = checkPage(doc, y, 14);
        card(doc, ML, y, CW, 12);
        setFont(doc, "bold", 9);
        rgb(doc, C.white);
        text(doc, item.name || "", ML + 4, y + 5);
        if (item.role || item.purpose) {
          setFont(doc, "normal", 7.5);
          rgb(doc, C.gray2);
          const desc = doc.splitTextToSize(item.role || item.purpose || "", CW - 60);
          text(doc, desc[0] || "", ML + 4, y + 10);
        }
        y += 15;
      });
      y += 3;
    });
    return;
  }

  // Handle tools section
  if (section.tools) {
    section.tools.forEach((tool, i) => {
      y = checkPage(doc, y, 20);
      card(doc, ML, y, CW, 18);
      setFont(doc, "bold", 9.5);
      rgb(doc, C.accent);
      text(doc, tool.tool_name || tool.name || "", ML + 4, y + 7);
      setFont(doc, "normal", 8);
      rgb(doc, C.gray2);
      y = wrappedText(doc, tool.purpose || "", ML + 4, y + 12, CW - 60, 8, C.gray2, "normal", 4.5);
      if (tool.invoked_by) {
        badge(doc, `Invoked by: ${tool.invoked_by}`, PW - MR - 55, y - 8, C.accentDim, C.white, 6.5);
      }
      y += 5;
    });
    return;
  }

  // Handle guardrails
  if (section.guardrails) {
    const severityColor = (rt) => {
      if (rt?.toLowerCase().includes("input")) return C.blue;
      if (rt?.toLowerCase().includes("output")) return C.red;
      if (rt?.toLowerCase().includes("execution")) return C.amber;
      return C.accent;
    };
    section.guardrails.forEach((rail) => {
      y = checkPage(doc, y, 24);
      const railColor = severityColor(rail.rail_type);
      card(doc, ML, y, CW, 22);
      rect(doc, ML, y, 4, 22, railColor, 2);
      setFont(doc, "bold", 9.5);
      rgb(doc, C.white);
      text(doc, rail.rail_type || "", ML + 8, y + 7);
      if (rail.functions) {
        rail.functions.slice(0, 2).forEach((fn, fi) => {
          setFont(doc, "normal", 7.5);
          rgb(doc, C.gray2);
          fill(doc, railColor);
          doc.circle(ML + 8, y + 12 + fi * 5, 0.8, "F");
          text(doc, fn, ML + 11, y + 13 + fi * 5);
        });
      }
      y += 26;
    });
    return;
  }

  // Handle metrics section
  if (section.metrics) {
    const cols = 2;
    const mw = (CW - 4) / cols;
    section.metrics.forEach((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0) y = checkPage(doc, y, 24);
      const mx = ML + col * (mw + 4);
      const my = y + row * 0;

      card(doc, mx, my, mw, 20);
      setFont(doc, "bold", 8);
      rgb(doc, C.gray2);
      text(doc, (m.metric || "").toUpperCase(), mx + 4, my + 7);
      setFont(doc, "bold", 13);
      rgb(doc, C.accent);
      text(doc, m.target || "—", mx + 4, my + 16);

      if (col === cols - 1 || i === section.metrics.length - 1) y += 24;
    });
    return;
  }

  // Handle memory architecture
  if (section.memory_architecture) {
    section.memory_architecture.forEach((mem) => {
      y = checkPage(doc, y, 28);
      card(doc, ML, y, CW, 26);
      setFont(doc, "bold", 10);
      rgb(doc, C.accent);
      text(doc, mem.memory_type || "", ML + 4, y + 8);
      if (mem.contents) {
        mem.contents.slice(0, 3).forEach((c, ci) => {
          fill(doc, C.accent);
          doc.circle(ML + 6, y + 13 + ci * 5, 0.8, "F");
          setFont(doc, "normal", 8);
          rgb(doc, C.gray1);
          text(doc, c, ML + 10, y + 14 + ci * 5);
        });
      }
      if (mem.storage) {
        setFont(doc, "bold", 7);
        rgb(doc, C.gray3);
        text(doc, "Storage: " + (Array.isArray(mem.storage) ? mem.storage.join(", ") : mem.storage), ML + 4, y + 23);
      }
      y += 30;
    });
    if (section.critical_practices) {
      y = checkPage(doc, y, 16);
      setFont(doc, "bold", 9);
      rgb(doc, C.gray2);
      text(doc, "Critical Practices", ML, y);
      y += 6;
      section.critical_practices.forEach((p) => {
        y = checkPage(doc, y, 8);
        fill(doc, C.accent);
        doc.circle(ML + 2, y - 1, 0.8, "F");
        y = wrappedText(doc, p, ML + 6, y, CW - 8, 8, C.gray1, "normal", 4.5) + 2;
      });
    }
    return;
  }

  // Handle tech stack
  if (section.stack) {
    const stackEntries = Object.entries(section.stack);
    stackEntries.forEach(([k, v]) => {
      y = checkPage(doc, y, 12);
      const vals = Array.isArray(v) ? v : [v];
      card(doc, ML, y, CW, 10);
      setFont(doc, "bold", 8);
      rgb(doc, C.gray2);
      text(doc, k.replace(/_/g, " ").toUpperCase(), ML + 4, y + 4);
      setFont(doc, "normal", 8);
      rgb(doc, C.white);
      text(doc, vals.join("  •  "), ML + 50, y + 4);
      // badge per item
      let bx = ML + 4;
      // single-line badges skipped for space
      setFont(doc, "normal", 7.5);
      rgb(doc, C.gray1);
      text(doc, vals.slice(0, 4).join("  |  "), ML + 50, y + 8);
      y += 13;
    });
    return;
  }

  // Handle generic content object
  if (section.content) {
    y = renderValue(doc, section.content, ML, y, CW);
  }

  // Handle report structure
  if (section.report_structure) {
    section.report_structure.forEach((item, i) => {
      y = checkPage(doc, y, 10);
      setFont(doc, "bold", 8);
      rgb(doc, C.accent);
      text(doc, String(i + 1).padStart(2, "0"), ML + 2, y);
      setFont(doc, "normal", 9);
      rgb(doc, C.gray1);
      text(doc, item, ML + 12, y);
      y += 8;
    });
  }

  // Handle workflows
  if (section.workflows) {
    section.workflows.forEach((wf, i) => {
      y = checkPage(doc, y, 14);
      card(doc, ML, y, CW, 12);
      badge(doc, String(i + 1), ML + 4, y + 8, C.accent, C.bg, 8);
      setFont(doc, "bold", 9.5);
      rgb(doc, C.white);
      text(doc, wf.workflow_name || "", ML + 14, y + 8);
      y += 15;
    });
  }
}

// ─── Footer on every page ─────────────────────────────────────────────────────

function drawFooter(doc, pageNum) {
  const total = doc.getNumberOfPages();
  rect(doc, 0, PH - 10, PW, 10, C.surface);
  setFont(doc, "normal", 6.5);
  rgb(doc, C.gray3);
  text(doc, "⚡ AgentForgeX  |  Confidential – AI-Generated Technical Design", ML, PH - 4);
  text(doc, `Page ${pageNum} of ${total}`, PW - MR - 14, PH - 4);
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function generatePDF(data, title = "Technical_Design") {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  // Cover
  drawCover(doc, data);

  // TOC
  doc.addPage();
  drawTOC(doc, data.table_of_contents || data.sections);

  // Workflow (always on its own page after TOC)
  doc.addPage();
  drawPageBg(doc);
  let wfY = 20;
  wfY = drawWorkflow(doc, wfY);

  // Content sections
  (data.sections || []).forEach((section) => {
    doc.addPage();
    drawSection(doc, section);
  });

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p);
  }

  doc.save(`${title.replace(/\s+/g, "_")}_Report.pdf`);
}
