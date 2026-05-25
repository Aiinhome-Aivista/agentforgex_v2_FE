/**
 * pptxGenerator.js — AgentForgeX
 *
 * Programmatic PPTX via pptxgenjs. White paper theme, enterprise consulting.
 * The "Agentic Process Workflow" slide renders the real swimlane from
 * getProcessFlow() as native shapes (roundRect, diamond, line) — no images.
 */

import pptxgen from "pptxgenjs";
import { layoutWorkflow, hasFlowData } from "./workflowRenderer";

// ─── Theme tokens (hex sans '#') ─────────────────────────────────────────────
const T = {
  paper: "FFFFFF",
  ink: "0F172A",
  inkSoft: "475569",
  inkMuted: "94A3B8",
  rule: "E2E8F0",
  surface: "F8FAFC",
  brand: "10B981",
  brandDk: "059669",
  navy: "1E293B",
};

const stripHash = (h) => (h || "").replace("#", "").toUpperCase();

// ─── Slide-level helpers ─────────────────────────────────────────────────────

function applyBase(slide) {
  slide.background = { color: T.paper };
  // Top emerald rule
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.05, fill: { color: T.brand }, line: { type: "none" } });
}

function addHeader(slide, sectionLabel = "") {
  slide.addText("AgentForgeX", {
    x: 0.3, y: 0.15, w: 2, h: 0.3,
    fontSize: 10, bold: true, color: T.brand, fontFace: "Calibri",
  });
  slide.addText("Technical Design Document", {
    x: 1.5, y: 0.15, w: 4, h: 0.3,
    fontSize: 9, color: T.inkSoft, fontFace: "Calibri",
  });
  if (sectionLabel) {
    slide.addText(sectionLabel, {
      x: 6, y: 0.15, w: 3.7, h: 0.3,
      fontSize: 9, bold: true, color: T.inkSoft, fontFace: "Calibri", align: "right",
    });
  }
  slide.addShape("line", { x: 0.3, y: 0.5, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
}

function addTitle(slide, num, title, subtitle) {
  // Big section number
  if (num) {
    slide.addText(num, {
      x: 0.3, y: 0.65, w: 0.8, h: 0.7,
      fontSize: 32, bold: true, color: T.brand, fontFace: "Calibri",
    });
  }
  slide.addText(title || "", {
    x: num ? 1.2 : 0.3, y: 0.7, w: 8.5, h: 0.5,
    fontSize: 22, bold: true, color: T.ink, fontFace: "Calibri",
  });
  // Accent rule
  slide.addShape("line", {
    x: num ? 1.2 : 0.3, y: 1.25,
    w: 1.5, h: 0, line: { color: T.brand, width: 1.5 },
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: num ? 1.2 : 0.3, y: 1.3, w: 8.5, h: 0.3,
      fontSize: 10, color: T.inkSoft, fontFace: "Calibri",
    });
  }
}

function addFooter(slide, pageNum, totalPages) {
  slide.addShape("line", { x: 0.3, y: 7.15, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
  slide.addText("AgentForgeX  |  Confidential – AI-Generated Technical Design", {
    x: 0.3, y: 7.2, w: 7, h: 0.25,
    fontSize: 8, color: T.inkSoft, fontFace: "Calibri",
  });
  slide.addText(`Page ${pageNum}${totalPages ? ` of ${totalPages}` : ""}`, {
    x: 7.5, y: 7.2, w: 2.2, h: 0.25,
    fontSize: 8, color: T.inkSoft, fontFace: "Calibri", align: "right",
  });
}

// ─── Cover slide ─────────────────────────────────────────────────────────────

function addCoverSlide(pptx, data, titleArg) {
  const cp = data.cover_page || data.document_metadata || {};
  const slide = pptx.addSlide();
  slide.background = { color: T.paper };

  // Hero band on top
  slide.addShape("rect", { x: 0, y: 0, w: 10, h: 2.2, fill: { color: T.navy }, line: { type: "none" } });
  // Bottom emerald slice on hero
  slide.addShape("rect", { x: 0, y: 2.15, w: 10, h: 0.06, fill: { color: T.brand }, line: { type: "none" } });

  slide.addText("AgentForgeX", { x: 0.4, y: 0.45, w: 3, h: 0.5, fontSize: 22, bold: true, color: T.paper, fontFace: "Calibri" });
  slide.addText("POWERED BY AGENTIC AI", { x: 0.4, y: 0.95, w: 3, h: 0.3, fontSize: 9, color: T.brand, fontFace: "Calibri", bold: true });
  // Confidential pill
  slide.addShape("roundRect", { x: 8, y: 0.5, w: 1.6, h: 0.35, fill: { color: T.navy }, line: { color: T.brand, width: 1 }, rectRadius: 0.06 });
  slide.addText("CONFIDENTIAL", { x: 8, y: 0.53, w: 1.6, h: 0.3, fontSize: 9, bold: true, color: T.brand, fontFace: "Calibri", align: "center" });

  slide.addText((cp.document_type || "Technical Design Document").toUpperCase(), {
    x: 0.4, y: 1.6, w: 9, h: 0.4, fontSize: 11, bold: true, color: T.inkMuted, fontFace: "Calibri",
  });

  // Title — clean, no suffix concat
  const displayTitle = (cp.title || titleArg || "Technical Design").trim();
  slide.addText(displayTitle, {
    x: 0.4, y: 2.6, w: 9.2, h: 1.6, fontSize: 28, bold: true, color: T.ink, fontFace: "Calibri", valign: "top",
  });

  if (cp.subtitle) {
    slide.addText(cp.subtitle, {
      x: 0.4, y: 4.3, w: 9.2, h: 0.6, fontSize: 14, color: T.inkSoft, fontFace: "Calibri",
    });
  }

  // Accent rule
  slide.addShape("line", { x: 0.4, y: 5.0, w: 2.0, h: 0, line: { color: T.brand, width: 2 } });

  // Metadata grid: 4 cells
  const grid = [
    ["DATE", cp.date || "—"],
    ["VERSION", cp.version || "Draft V1.0"],
    ["ORGANIZATION", "AgentForge"],
    ["CLASSIFICATION", "Confidential"],
  ];
  const baseX = 0.4, baseY = 5.4, colW = 2.32, rowH = 0.95;
  grid.forEach((m, i) => {
    const x = baseX + i * colW;
    slide.addShape("rect", { x, y: baseY, w: colW - 0.05, h: rowH, fill: { color: T.surface }, line: { color: T.rule, width: 0.5 } });
    slide.addText(m[0], { x: x + 0.1, y: baseY + 0.08, w: colW - 0.2, h: 0.3, fontSize: 9, bold: true, color: T.brand, fontFace: "Calibri" });
    slide.addText(m[1], { x: x + 0.1, y: baseY + 0.38, w: colW - 0.2, h: 0.5, fontSize: 13, bold: true, color: T.ink, fontFace: "Calibri", valign: "top" });
  });

  // Cover footer
  slide.addText("Generated by AgentForgeX  |  AI-Powered Technical Design Platform", {
    x: 0.3, y: 7.25, w: 9.4, h: 0.2, fontSize: 8, color: T.inkMuted, fontFace: "Calibri",
  });
}

// ─── TOC slide ───────────────────────────────────────────────────────────────

function addTOCSlide(pptx, data) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "TABLE OF CONTENTS");
  addTitle(slide, null, "Table of Contents");

  // 1. Agentic Process Workflow (Manual first entry)
  const items = [
    ["01", "Agentic Process Workflow"],
    ...(data.sections || []).map((s, i) => [
      String(i + 2).padStart(2, "0"),
      s.title || "",
    ])
  ];

  const rows = [
    [
      { text: "#", options: { bold: true, color: T.paper, fill: { color: T.navy }, fontSize: 11 } },
      { text: "Section", options: { bold: true, color: T.paper, fill: { color: T.navy }, fontSize: 11 } },
    ],
    ...items.map(([n, t], i) => [
      { text: n, options: { bold: true, color: T.brand, fill: { color: i % 2 === 0 ? T.surface : T.paper }, fontSize: 11 } },
      { text: t, options: { color: T.ink, fill: { color: i % 2 === 0 ? T.surface : T.paper }, fontSize: 11 } },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.4, y: 1.7, w: 9.2,
    colW: [0.8, 8.4],
    border: { type: "solid", color: T.rule, pt: 0.5 },
    fontFace: "Calibri",
    rowH: 0.35,
  });
}

// ─── Real swimlane workflow slide ────────────────────────────────────────────

function addWorkflowSlide(pptx, flowData) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "AGENTIC PROCESS WORKFLOW");
  addTitle(slide, null, "Agentic Process Workflow",
    "Operating Model: Agentic Operations  •  End-to-end business process flow");

  if (!hasFlowData(flowData)) {
    slide.addText("Process flow data not available for this analysis.", {
      x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 14, italic: true, color: T.inkSoft, fontFace: "Calibri", align: "center",
    });
    return;
  }

  const layout = layoutWorkflow(flowData);

  // Render area on slide (inches): 10 x 7.5 slide; reserve top for header/title and bottom for footer
  const availX = 0.3;
  const availY = 1.7;
  const availW = 9.4;
  const availH = 5.3;

  // mm → inches (1 in = 25.4 mm); then additional scale to fit both dims
  const mmToIn = 1 / 25.4;
  const widthIn = layout.width * mmToIn;
  const heightIn = layout.height * mmToIn;
  const scale = Math.min(availW / widthIn, availH / heightIn);

  const renderW = widthIn * scale;
  const renderH = heightIn * scale;
  const offsetX = availX + (availW - renderW) / 2;
  const offsetY = availY;

  // Convert layout-mm coords → slide inches
  const toX = (mm) => offsetX + (mm * mmToIn) * scale;
  const toY = (mm) => offsetY + (mm * mmToIn) * scale;
  const toS = (mm) => mm * mmToIn * scale;

  // Process title (centered above lanes inside renderable area)
  slide.addText(layout.title, {
    x: offsetX, y: offsetY - 0.32, w: renderW, h: 0.28,
    fontSize: 11, bold: true, color: T.ink, fontFace: "Calibri", align: "center",
  });

  // Lane backgrounds and labels
  layout.lanes.forEach((lane) => {
    const lx = offsetX;
    const ly = toY(lane.top);
    const lw = renderW;
    const lh = toS(lane.height);

    // Tinted background band
    slide.addShape("rect", {
      x: lx, y: ly, w: lw, h: lh,
      fill: { color: stripHash(lane.tint) },
      line: { color: T.rule, width: 0.3 },
    });
    // Left accent strip
    slide.addShape("rect", {
      x: lx + toS(3), y: ly + toS(2),
      w: toS(1.5), h: lh - toS(4),
      fill: { color: stripHash(lane.accent) },
      line: { type: "none" },
    });
    // Lane label
    slide.addText(lane.label, {
      x: lx + toS(6), y: ly, w: toS(28), h: lh,
      fontSize: Math.max(8, 10 * scale),
      bold: true,
      color: stripHash(lane.text),
      fontFace: "Calibri",
      valign: "middle",
      wrap: true,
    });
  });

  // Edges (drawn before nodes so nodes sit on top)
  layout.edges.forEach((edge) => {
    const x1 = toX(edge.fromX);
    const y1 = toY(edge.fromY);
    const x2 = toX(edge.toX);
    const y2 = toY(edge.toY);
    const color = edge.kind === "interlane" ? T.inkMuted : T.inkSoft;

    if (edge.routing === "vertical") {
      // Right-angle elbow vertical-first: x1,y1 → x1,mid → x2,mid → x2,y2
      const midY = (y1 + y2) / 2;
      slide.addShape("line", { x: x1, y: Math.min(y1, midY), w: 0, h: Math.abs(midY - y1), line: { color, width: 1 } });
      const w = x2 - x1;
      slide.addShape("line", { x: w < 0 ? x2 : x1, y: midY, w: Math.abs(w), h: 0, flipH: w < 0, line: { color, width: 1 } });
      slide.addShape("line", { x: x2, y: Math.min(midY, y2), w: 0, h: Math.abs(y2 - midY), line: { color, width: 1, endArrowType: "triangle" } });
    } else if (Math.abs(y1 - y2) < 0.01) {
      // Straight horizontal
      const w = x2 - x1;
      slide.addShape("line", {
        x: w < 0 ? x2 : x1, y: y1, w: Math.abs(w), h: 0,
        flipH: w < 0,
        line: { color, width: 1, endArrowType: "triangle" },
      });
    } else {
      // Right-angle elbow: x1,y1 → mid,y1 → mid,y2 → x2,y2
      const midX = (x1 + x2) / 2;
      const w1 = midX - x1;
      slide.addShape("line", { x: w1 < 0 ? midX : x1, y: y1, w: Math.abs(w1), h: 0, flipH: w1 < 0, line: { color, width: 1 } });
      slide.addShape("line", { x: midX, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), line: { color, width: 1 } });
      const w2 = x2 - midX;
      slide.addShape("line", { x: w2 < 0 ? x2 : midX, y: y2, w: Math.abs(w2), h: 0, flipH: w2 < 0, line: { color, width: 1, endArrowType: "triangle" } });
    }

    if (edge.label) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      slide.addText(edge.label, {
        x: mx - 0.3, y: my - 0.15, w: 0.6, h: 0.18,
        fontSize: 7, bold: true, color: T.inkSoft, fontFace: "Calibri", align: "center",
        fill: { color: T.paper },
      });
    }
  });

  // Nodes
  layout.nodes.forEach((node) => {
    const x = toX(node.x);
    const y = toY(node.y);
    const w = toS(node.w);
    const h = toS(node.h);
    const fill = stripHash(node.fill);
    const lineC = stripHash(node.stroke);
    const textC = stripHash(node.text);

    if (node.type === "start" || node.type === "end") {
      slide.addShape("roundRect", {
        x, y, w, h,
        fill: { color: fill },
        line: { color: lineC, width: 1.2 },
        rectRadius: h / 2,
      });
    } else if (node.type === "decision") {
      slide.addShape("diamond", {
        x, y, w, h,
        fill: { color: fill },
        line: { color: lineC, width: 1.2 },
      });
    } else {
      slide.addShape("rect", {
        x, y, w, h,
        fill: { color: fill },
        line: { color: T.rule, width: 0.5 },
      });
      // left accent bar (lane accent)
      slide.addShape("rect", {
        x, y, w: Math.min(0.05, toS(1.5)), h,
        fill: { color: stripHash(node.accent) },
        line: { type: "none" },
      });
    }
    slide.addText(node.label, {
      x: x + (node.type === "process" ? 0.06 : 0.02),
      y, w: w - (node.type === "process" ? 0.08 : 0.04), h,
      fontSize: Math.max(7, 8.5 * scale),
      bold: node.type !== "process",
      color: textC,
      fontFace: "Calibri",
      align: "center",
      valign: "middle",
      wrap: true,
    });
  });
}

// ─── Section slide helpers ───────────────────────────────────────────────────

function tableHeaderRow(headers) {
  return headers.map((h) => ({
    text: h,
    options: { bold: true, color: T.paper, fill: { color: T.navy }, fontSize: 10, fontFace: "Calibri" },
  }));
}

function tableDataRow(row, ri) {
  return row.map((cell) => ({
    text: String(cell ?? ""),
    options: {
      color: T.ink,
      fill: { color: ri % 2 === 0 ? T.surface : T.paper },
      fontSize: 10,
      fontFace: "Calibri",
      valign: "top",
    },
  }));
}

function addTableSlide(pptx, num, title, subtitle, headers, rows, colW) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, title.toUpperCase());
  addTitle(slide, num, title, subtitle);
  slide.addTable(
    [tableHeaderRow(headers), ...rows.map((r, i) => tableDataRow(r, i))],
    {
      x: 0.3, y: 1.7, w: 9.4,
      colW: colW || Array(headers.length).fill(9.4 / headers.length),
      border: { type: "solid", color: T.rule, pt: 0.5 },
      fontFace: "Calibri",
      rowH: 0.35,
      autoPage: true,
      autoPageRepeatHeader: true,
    }
  );
}

function addExecutiveSummarySlide(pptx, num, section) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "EXECUTIVE SUMMARY");
  addTitle(slide, num, section.title || "Executive Summary");
  const c = section.content || {};
  let y = 1.7;

  const addBlock = (label, value, italic = false) => {
    if (!value) return;
    slide.addText(label, {
      x: 0.3, y, w: 9.4, h: 0.3, fontSize: 11, bold: true, color: T.brand, fontFace: "Calibri",
    });
    y += 0.32;
    slide.addText(value, {
      x: 0.3, y, w: 9.4, h: 0.9, fontSize: 11, color: T.ink, fontFace: "Calibri", italic,
    });
    y += 0.95;
  };

  if (c.purpose) addBlock("Purpose", c.purpose);
  if (c.problem_statement) addBlock("Problem Statement", c.problem_statement);
  if (c.design_philosophy?.statement) addBlock("Design Philosophy", c.design_philosophy.statement, true);

  if (Array.isArray(c.primary_goals) && c.primary_goals.length) {
    slide.addText("Primary Goals", {
      x: 0.3, y, w: 9.4, h: 0.3, fontSize: 11, bold: true, color: T.brand, fontFace: "Calibri",
    });
    y += 0.32;
    const goalsText = c.primary_goals.map((g) => `•  ${g}`).join("\n");
    slide.addText(goalsText, {
      x: 0.3, y, w: 9.4, h: 7.0 - y - 0.4, fontSize: 11, color: T.ink, fontFace: "Calibri",
      paraSpaceAfter: 6, wrap: true,
    });
  }
}

function addMetricsSlide(pptx, num, section) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "SUCCESS METRICS");
  addTitle(slide, num, section.title || "Success Criteria and Eval Metrics");

  const metrics = section.metrics || [];
  const cols = 3;
  const cellW = 9.4 / cols - 0.1;
  const cellH = 1.4;
  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.3 + col * (cellW + 0.1);
    const y = 1.7 + row * (cellH + 0.15);
    if (y + cellH > 6.9) return;
    slide.addShape("rect", { x, y, w: cellW, h: cellH, fill: { color: T.surface }, line: { color: T.rule, width: 0.5 } });
    slide.addShape("rect", { x, y, w: cellW, h: 0.08, fill: { color: T.brand }, line: { type: "none" } });
    slide.addText((m.metric || "").toUpperCase(), {
      x: x + 0.1, y: y + 0.15, w: cellW - 0.2, h: 0.35,
      fontSize: 9, bold: true, color: T.brand, fontFace: "Calibri",
    });
    slide.addText(m.target || "—", {
      x: x + 0.1, y: y + 0.52, w: cellW - 0.2, h: 0.8,
      fontSize: 11, color: T.ink, fontFace: "Calibri", valign: "top", wrap: true,
    });
  });
}

function addArchitectureLayerSlides(pptx, num, layer) {
  if (Array.isArray(layer.agents) && layer.agents.length) {
    addTableSlide(pptx, num, `Layer ${layer.layer_id}: ${layer.name}`, "AI Agents",
      ["#", "Name", "Role", "Framework", "Model Tier"],
      layer.agents.map((a) => [
        String(a.agent_id || ""), a.name || "", a.role || "",
        a.reasoning_framework || "", a.model_tier || "",
      ]),
      [0.4, 1.5, 3.5, 2, 2]
    );
  }
  if (Array.isArray(layer.components) && layer.components.length) {
    addTableSlide(pptx, num, `Layer ${layer.layer_id}: ${layer.name}`, "Components",
      ["Component", "Responsibilities"],
      layer.components.map((c) => [
        c.component_name || c.name || "",
        Array.isArray(c.responsibilities) ? c.responsibilities.join("; ") : (c.responsibilities || ""),
      ]),
      [2.5, 6.9]
    );
  }
  if (Array.isArray(layer.rag_pipeline) && layer.rag_pipeline.length) {
    addTableSlide(pptx, num, `Layer ${layer.layer_id}: ${layer.name}`, "RAG Pipeline",
      ["Stage", "Name", "Components"],
      layer.rag_pipeline.map((s) => [
        String(s.stage), s.name || "",
        Array.isArray(s.components) ? s.components.join("; ") : (s.components || ""),
      ]),
      [0.7, 3.5, 5.2]
    );
  }
}

// ─── Section dispatcher ──────────────────────────────────────────────────────

function addSectionSlides(pptx, section, index) {
  const num = String(index + 2).padStart(2, "0");
  const title = section.title || "Section";

  if (section.architecture_layers) {
    section.architecture_layers.forEach((l) => addArchitectureLayerSlides(pptx, num, l));
    return;
  }
  if (section.subsections) {
    section.subsections.forEach((sub) => {
      if (Array.isArray(sub.principles)) {
        addTableSlide(pptx, num, `${title}`, sub.title,
          ["#", "Principle", "Application"],
          sub.principles.map((pr) => [String(pr.id || ""), pr.name || "", pr.application || ""]),
          [0.5, 2.3, 6.6]);
      } else if (Array.isArray(sub.categories)) {
        addTableSlide(pptx, num, `${title}`, sub.title,
          ["Type", "Description"],
          sub.categories.map((c) => [c.type || "", c.description || ""]),
          [2.2, 7.2]);
      }
    });
    return;
  }
  if (section.frameworks) {
    const fw = section.frameworks;
    const groups = [
      ["Orchestration", fw.orchestration],
      ["RAG Frameworks", fw.rag_frameworks],
      ["Guardrails", fw.guardrails],
      ["Evaluation Tools", fw.evaluation_tools],
      ["Protocols", fw.protocols],
    ];
    groups.forEach(([label, list]) => {
      if (!Array.isArray(list) || !list.length) return;
      addTableSlide(pptx, num, `${title}`, label,
        ["Name", "Role / Purpose"],
        list.map((it) => [it.name || "", it.role || it.purpose || ""]),
        [2.5, 6.9]);
    });
    return;
  }
  if (section.tools) {
    addTableSlide(pptx, num, title, "Tool Ecosystem",
      ["Tool", "Purpose", "Invoked By"],
      section.tools.map((t) => [t.tool_name || t.name || "", t.purpose || "", t.invoked_by || ""]),
      [2.3, 5.0, 2.1]);
    return;
  }
  if (section.guardrails) {
    addTableSlide(pptx, num, title, "Guardrails",
      ["Rail Type", "Functions"],
      section.guardrails.map((r) => [r.rail_type || "", (r.functions || []).join("; ")]),
      [2.3, 7.1]);
    if (section.observability) {
      addTableSlide(pptx, num, title, "Observability",
        ["Aspect", "Details"],
        Object.entries(section.observability).map(([k, v]) =>
          [k.replace(/_/g, " "), Array.isArray(v) ? v.join(", ") : String(v)]
        ),
        [2.5, 6.9]);
    }
    return;
  }
  if (section.metrics) { addMetricsSlide(pptx, num, section); return; }
  if (section.memory_architecture) {
    addTableSlide(pptx, num, title, "Memory Architecture",
      ["Type", "Contents", "Storage"],
      section.memory_architecture.map((m) => [
        m.memory_type || "",
        Array.isArray(m.contents) ? m.contents.join("; ") : (m.contents || ""),
        Array.isArray(m.storage) ? m.storage.join(", ") : (m.storage || ""),
      ]),
      [2, 5, 2.4]);
    if (Array.isArray(section.critical_practices) && section.critical_practices.length) {
      addTableSlide(pptx, num, title, "Critical Practices",
        ["#", "Practice"],
        section.critical_practices.map((p, i) => [String(i + 1), p]),
        [0.6, 8.8]);
    }
    return;
  }
  if (section.stack) {
    addTableSlide(pptx, num, title, "Tech Stack Summary",
      ["Layer", "Technologies"],
      Object.entries(section.stack).map(([k, v]) => [
        k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        Array.isArray(v) ? v.join(" · ") : String(v),
      ]),
      [2.6, 6.8]);
    return;
  }
  if (section.workflows) {
    addTableSlide(pptx, num, title, "End-to-End Workflows",
      ["#", "Workflow", "Description"],
      section.workflows.map((w, i) => [String(i + 1), w.workflow_name || w.name || "", w.description || ""]),
      [0.5, 3.2, 5.7]);
    return;
  }
  if (section.report_structure) {
    addTableSlide(pptx, num, title, "Report Structure",
      ["#", "Section"],
      section.report_structure.map((it, i) => [String(i + 1).padStart(2, "0"), it]),
      [0.7, 8.7]);
    return;
  }
  if (section.content) {
    if (section.section_number === 1 || /executive/i.test(section.title || "")) {
      addExecutiveSummarySlide(pptx, num, section);
    } else {
      // Fallback: generic key/value slide
      const slide = pptx.addSlide();
      applyBase(slide);
      addHeader(slide, title.toUpperCase());
      addTitle(slide, num, title);
      const lines = flattenObject(section.content).slice(0, 18);
      let y = 1.7;
      lines.forEach((ln) => {
        slide.addText(ln.text, {
          x: 0.3 + ln.depth * 0.2, y, w: 9.1 - ln.depth * 0.2, h: 0.3,
          fontSize: ln.bold ? 11 : 10, bold: ln.bold, color: ln.bold ? T.brand : T.ink, fontFace: "Calibri",
        });
        y += ln.bold ? 0.35 : 0.3;
        if (y > 6.9) return;
      });
    }
  }
}

function flattenObject(val, depth = 0) {
  const out = [];
  if (val === null || val === undefined) return out;
  if (typeof val === "string" || typeof val === "number") { out.push({ text: String(val), depth }); return out; }
  if (Array.isArray(val)) {
    val.forEach((v) => out.push(...flattenObject(v, depth)));
    return out;
  }
  Object.entries(val).forEach(([k, v]) => {
    out.push({ text: k.replace(/_/g, " "), depth, bold: true });
    out.push(...flattenObject(v, depth + 1));
  });
  return out;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePPTX(data, title = "Technical_Design", flowData = null) {
  const pptx = new pptxgen();
  // 10 x 7.5 inches standard
  pptx.defineLayout({ name: "STD_10X75", width: 10, height: 7.5 });
  pptx.layout = "STD_10X75";
  pptx.author = "AgentForgeX";
  // Sanitize title for metadata properties (remove non-ascii for stability)
  pptx.title = (title || "Technical_Design").replace(/[^\x00-\x7F]/g, " ");

  // Define a single white-paper master with footer
  pptx.defineSlideMaster({
    title: "MASTER",
    background: { color: T.paper },
    objects: [],
  });

  addCoverSlide(pptx, data, title);
  addTOCSlide(pptx, data);
  addWorkflowSlide(pptx, flowData);

  (data.sections || []).forEach((section, i) => addSectionSlides(pptx, section, i));

  // Footers — pptxgenjs doesn't easily back-fill counters, so we walk slides
  // and add per-slide footers after creation:
  const totalSlides = pptx.slides ? pptx.slides.length : 0;
  pptx.slides?.forEach((slide, i) => {
    if (i === 0) {
      // cover has its own footer
      return;
    }
    // Re-add footer (already drawn applyBase on these slides above; we just want pagination)
    slide.addText(`Page ${i + 1} of ${totalSlides}`, {
      x: 7.5, y: 7.2, w: 2.2, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri", align: "right",
    });
    slide.addText("AgentForgeX  |  Confidential – AI-Generated Technical Design", {
      x: 0.3, y: 7.2, w: 7, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri",
    });
    slide.addShape("line", { x: 0.3, y: 7.15, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
  });

  await pptx.writeFile({ fileName: `${title.replace(/[^a-z0-9_-]+/gi, "_")}_Report.pptx` });
}
