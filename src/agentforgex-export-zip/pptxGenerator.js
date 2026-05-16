/**
 * pptxGenerator.js
 * Programmatic PPTX via pptxgenjs — text, shapes, tables only. Zero image embeds.
 * Target: < 1 MB
 */

import pptxgen from "pptxgenjs";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:      "08080C",
  surface: "0E1422",
  accent:  "10B981",
  accentDk:"065F46",
  white:   "FFFFFF",
  gray1:   "DCE1EB",
  gray2:   "A0AABB",
  gray3:   "50596C",
  border:  "1E2840",
  red:     "EF4444",
  amber:   "F59E0B",
  blue:    "3B82F6",
};

// ─── Slide layout helpers ──────────────────────────────────────────────────────

/** Dark background + left green bar on every slide */
function applyBase(slide) {
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: T.bg } });
  slide.addShape("rect", { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: T.accent } });
}

/** Top header bar */
function addHeader(slide, title, subtitle = "") {
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 1.0, fill: { color: T.surface } });
  // Brand
  slide.addText("⚡ AgentForgeX", { x: 0.15, y: 0.08, w: 2, h: 0.35, fontSize: 11, bold: true, color: T.accent, fontFace: "Calibri" });
  // Title
  slide.addText(title, { x: 0.15, y: 0.4, w: 8.5, h: 0.5, fontSize: 18, bold: true, color: T.white, fontFace: "Calibri" });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.15, y: 0.75, w: 8.5, h: 0.25, fontSize: 10, color: T.gray2, fontFace: "Calibri" });
  }
}

/** Bottom footer */
function addFooter(slide, pageNum) {
  slide.addShape("rect", { x: 0, y: 6.9, w: "100%", h: 0.3, fill: { color: T.surface } });
  slide.addText("AgentForgeX  |  Confidential – AI-Generated Technical Design", {
    x: 0.15, y: 6.92, w: 7, h: 0.2, fontSize: 7, color: T.gray3, fontFace: "Calibri",
  });
  slide.addText(`${pageNum}`, {
    x: 9.2, y: 6.92, w: 0.5, h: 0.2, fontSize: 7, color: T.gray3, align: "right", fontFace: "Calibri",
  });
}

/** Section label pill */
function sectionPill(slide, label, x, y) {
  slide.addShape("roundRect", { x, y, w: label.length * 0.12 + 0.5, h: 0.28, fill: { color: T.accentDk }, rectRadius: 0.05 });
  slide.addText(label.toUpperCase(), { x, y: y + 0.04, w: label.length * 0.12 + 0.5, h: 0.2, fontSize: 7, bold: true, color: T.accent, align: "center", fontFace: "Calibri" });
}

/** Card shape */
function card(slide, x, y, w, h, fillColor = T.surface) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: fillColor }, line: { color: T.border, pt: 0.5 }, rectRadius: 0.08 });
}

/** Accent line separator */
function accentLine(slide, y) {
  slide.addShape("line", { x: 0.15, y, w: 9.55, h: 0, line: { color: T.accent, pt: 1 } });
}

// ─── Cover slide ──────────────────────────────────────────────────────────────

function addCoverSlide(pptx, data, title, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);

  const cp = data.cover_page || data.document_metadata || {};

  // Background glow effect (large low-opacity shape)
  slide.addShape("ellipse", { x: 6.5, y: -1, w: 5, h: 5, fill: { type: "solid", color: "10B981", transparency: 93 } });

  // Brand
  slide.addText("⚡ AgentForgeX", { x: 0.2, y: 0.2, w: 3, h: 0.4, fontSize: 14, bold: true, color: T.accent, fontFace: "Calibri" });
  // Confidential badge
  slide.addShape("roundRect", { x: 8.8, y: 0.2, w: 1.1, h: 0.3, fill: { color: T.surface }, line: { color: T.accent, pt: 0.5 }, rectRadius: 0.05 });
  slide.addText("CONFIDENTIAL", { x: 8.8, y: 0.23, w: 1.1, h: 0.22, fontSize: 6, bold: true, color: T.accent, align: "center", fontFace: "Calibri" });

  // Doc type
  const docType = (cp.document_type || "Technical Design Document").toUpperCase();
  slide.addText(docType, { x: 0.2, y: 1.6, w: 6, h: 0.3, fontSize: 9, bold: true, color: T.accent, fontFace: "Calibri" });

  // Main title
  const displayTitle = title || cp.title || "Agentic AI Technical Design";
  slide.addText(displayTitle, { x: 0.2, y: 1.95, w: 7.5, h: 1.8, fontSize: 26, bold: true, color: T.white, fontFace: "Calibri", wrap: true });

  // Subtitle
  if (cp.subtitle) {
    slide.addText(cp.subtitle, { x: 0.2, y: 3.85, w: 7.5, h: 0.4, fontSize: 13, color: T.gray2, fontFace: "Calibri" });
  }

  accentLine(slide, 4.4);

  // Meta grid
  const meta = [
    { label: "DATE", value: cp.date || "2026" },
    { label: "VERSION", value: cp.version || "Draft V1.0" },
    { label: "ORGANIZATION", value: cp.organization || "PwC" },
    { label: "STATUS", value: "Confidential" },
  ];
  meta.forEach((m, i) => {
    const x = 0.2 + (i % 2) * 4.8;
    const y = 4.6 + Math.floor(i / 2) * 0.75;
    slide.addText(m.label, { x, y, w: 4.5, h: 0.2, fontSize: 7, bold: true, color: T.accent, fontFace: "Calibri" });
    slide.addText(m.value, { x, y: y + 0.2, w: 4.5, h: 0.35, fontSize: 12, color: T.white, fontFace: "Calibri" });
  });

  addFooter(slide, pageNum);
}

// ─── TOC slide ────────────────────────────────────────────────────────────────

function addTOCSlide(pptx, data, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "Table of Contents");

  const toc = data.table_of_contents || data.sections || [];
  const rows = toc.map(s => [
    { text: String(s.section_number || s.section_no || ""), options: { bold: true, color: T.accent, fontSize: 10 } },
    { text: s.title || "", options: { color: T.gray1, fontSize: 10 } },
    { text: String(s.page || ""), options: { color: T.gray2, fontSize: 10, align: "right" } },
  ]);

  slide.addTable([
    [
      { text: "#",       options: { bold: true, color: T.accent, fill: T.surface, fontSize: 10 } },
      { text: "Section", options: { bold: true, color: T.accent, fill: T.surface, fontSize: 10 } },
      { text: "Page",    options: { bold: true, color: T.accent, fill: T.surface, fontSize: 10 } },
    ],
    ...rows,
  ], {
    x: 0.2, y: 1.1, w: 9.5, colW: [0.6, 7.8, 0.9],
    border: { type: "solid", color: T.border, pt: 0.5 },
    fill: T.bg,
    rowH: 0.35,
    fontFace: "Calibri",
  });

  addFooter(slide, pageNum);
}

// ─── Workflow slide ───────────────────────────────────────────────────────────

function addWorkflowSlide(pptx, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "Agentic Process Workflow", "Operating Model: Hierarchical Orchestrator  |  Reasoning: Plan-and-Execute + ReAct");

  const stages = [
    { label: "Input\nCollection",   color: T.blue,   icon: "📥" },
    { label: "Data\nProcessing",    color: "8B5CF6", icon: "⚙️" },
    { label: "AI\nAnalysis",        color: T.accent, icon: "🧠" },
    { label: "Multi-Agent\nCollab", color: "EC4899", icon: "🤝" },
    { label: "Validation",          color: T.amber,  icon: "✅" },
    { label: "Design\nGen",         color: "0EA5E9", icon: "📄" },
    { label: "Final\nOutput",       color: T.accent, icon: "🚀" },
  ];

  const nodeW = 1.2;
  const nodeH = 1.4;
  const gap = 0.18;
  const startX = 0.2;
  const rowY = 2.0;

  stages.forEach((s, i) => {
    const nx = startX + i * (nodeW + gap);

    // connector
    if (i < stages.length - 1) {
      slide.addShape("line", { x: nx + nodeW, y: rowY + nodeH / 2, w: gap, h: 0, line: { color: T.gray3, pt: 1.2 } });
      // arrowhead via triangle
      slide.addShape("rtTriangle", { x: nx + nodeW + gap - 0.06, y: rowY + nodeH / 2 - 0.07, w: 0.07, h: 0.14, fill: { color: T.gray3 }, rotate: 90 });
    }

    // card bg
    slide.addShape("roundRect", { x: nx, y: rowY, w: nodeW, h: nodeH, fill: { color: T.surface }, line: { color: s.color, pt: 0.8 }, rectRadius: 0.08 });
    // top color bar
    slide.addShape("roundRect", { x: nx, y: rowY, w: nodeW, h: 0.18, fill: { color: s.color }, rectRadius: 0.04 });

    // icon
    slide.addText(s.icon, { x: nx, y: rowY + 0.22, w: nodeW, h: 0.4, fontSize: 18, align: "center" });
    // label
    slide.addText(s.label, { x: nx, y: rowY + 0.68, w: nodeW, h: 0.65, fontSize: 8, bold: true, color: T.gray1, align: "center", fontFace: "Calibri", wrap: true });
  });

  // Stage numbers below
  stages.forEach((s, i) => {
    const nx = startX + i * (nodeW + gap);
    slide.addText(String(i + 1).padStart(2, "0"), {
      x: nx, y: rowY + nodeH + 0.1, w: nodeW, h: 0.25, fontSize: 9, bold: true, color: s.color, align: "center", fontFace: "Calibri",
    });
  });

  addFooter(slide, pageNum);
}

// ─── Agent specs slide ────────────────────────────────────────────────────────

function addAgentsSlide(pptx, agents, layerName, pageNum) {
  // split into groups of 3 per slide
  for (let i = 0; i < agents.length; i += 3) {
    const chunk = agents.slice(i, Math.min(i + 3, agents.length));
    const slide = pptx.addSlide();
    applyBase(slide);
    addHeader(slide, layerName, `Agents ${i + 1}–${i + chunk.length}`);

    chunk.forEach((agent, j) => {
      const cardY = 1.1 + j * 1.85;
      card(slide, 0.15, cardY, 9.55, 1.7);
      // left accent
      slide.addShape("rect", { x: 0.15, y: cardY, w: 0.08, h: 1.7, fill: { color: T.accent } });

      slide.addText(`${agent.agent_id}. ${agent.name}`, { x: 0.35, y: cardY + 0.1, w: 7, h: 0.3, fontSize: 12, bold: true, color: T.white, fontFace: "Calibri" });
      slide.addText(agent.role || "", { x: 0.35, y: cardY + 0.4, w: 7, h: 0.3, fontSize: 9.5, color: T.accent, fontFace: "Calibri" });

      // Framework badge
      sectionPill(slide, agent.reasoning_framework || "", 0.35, cardY + 0.72);

      slide.addText("Model: " + (agent.model_tier || ""), {
        x: 0.35, y: cardY + 1.1, w: 8.5, h: 0.3, fontSize: 8, color: T.gray2, fontFace: "Calibri",
      });

      if (agent.responsibilities?.length) {
        const resp = agent.responsibilities.slice(0, 2).map(r => `• ${r}`).join("  ");
        slide.addText(resp, {
          x: 0.35, y: cardY + 1.35, w: 8.5, h: 0.28, fontSize: 7.5, color: T.gray3, fontFace: "Calibri", wrap: false,
        });
      }
    });

    addFooter(slide, pageNum);
    pageNum++;
  }
  return pageNum;
}

// ─── Table slide ──────────────────────────────────────────────────────────────

function addTableSlide(pptx, title, headers, rows, pageNum, subtitle = "") {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, title, subtitle);

  const headerRow = headers.map(h => ({
    text: h, options: { bold: true, color: T.accent, fill: T.surface, fontSize: 9.5, fontFace: "Calibri" }
  }));

  const dataRows = rows.map((row, ri) =>
    row.map(cell => ({
      text: String(cell ?? ""),
      options: { color: T.gray1, fill: ri % 2 === 0 ? "0F1828" : T.bg, fontSize: 9, fontFace: "Calibri", wrap: true }
    }))
  );

  const colW = Array(headers.length).fill(9.5 / headers.length);

  slide.addTable([headerRow, ...dataRows], {
    x: 0.15, y: 1.05, w: 9.5, colW,
    border: { type: "solid", color: T.border, pt: 0.5 },
    rowH: 0.4,
    fontFace: "Calibri",
  });

  addFooter(slide, pageNum);
}

// ─── Metrics slide ────────────────────────────────────────────────────────────

function addMetricsSlide(pptx, metrics, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "Success Criteria & Eval Metrics");

  const cols = 3;
  const mw = 9.55 / cols - 0.1;
  const mh = 1.35;

  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = 0.15 + col * (mw + 0.15);
    const my = 1.15 + row * (mh + 0.12);

    card(slide, mx, my, mw, mh);
    // top bar
    slide.addShape("rect", { x: mx, y: my, w: mw, h: 0.12, fill: { color: T.accentDk } });

    slide.addText((m.metric || "").toUpperCase(), {
      x: mx + 0.1, y: my + 0.2, w: mw - 0.2, h: 0.35, fontSize: 8, bold: true, color: T.gray2, fontFace: "Calibri", wrap: true,
    });
    slide.addText(m.target || "—", {
      x: mx + 0.1, y: my + 0.6, w: mw - 0.2, h: 0.6, fontSize: 16, bold: true, color: T.accent, fontFace: "Calibri",
    });
  });

  addFooter(slide, pageNum);
}

// ─── Tech stack slide ─────────────────────────────────────────────────────────

function addTechStackSlide(pptx, stack, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);
  addHeader(slide, "Tech Stack Summary");

  const entries = Object.entries(stack);
  const rows = entries.map(([k, v]) => [
    k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    Array.isArray(v) ? v.join("  •  ") : String(v),
  ]);

  slide.addTable([
    [
      { text: "Layer",       options: { bold: true, color: T.accent, fill: T.surface, fontSize: 9.5, fontFace: "Calibri" } },
      { text: "Technologies", options: { bold: true, color: T.accent, fill: T.surface, fontSize: 9.5, fontFace: "Calibri" } },
    ],
    ...rows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: { color: T.gray1, fill: ri % 2 === 0 ? "0F1828" : T.bg, fontSize: 9, fontFace: "Calibri" },
    }))),
  ], {
    x: 0.15, y: 1.05, w: 9.5, colW: [2.8, 6.7],
    border: { type: "solid", color: T.border, pt: 0.5 },
    rowH: 0.38,
    fontFace: "Calibri",
  });

  addFooter(slide, pageNum);
}

// ─── Generic content slide ────────────────────────────────────────────────────

function addGenericSlide(pptx, section, pageNum) {
  const slide = pptx.addSlide();
  applyBase(slide);
  const num = String(section.section_number || section.section_no || "").padStart(2, "0");
  addHeader(slide, `${num}  ${section.title || "Section"}`);

  // Render subsections as bullet list
  const lines = [];

  function flatten(val, depth = 0) {
    if (!val) return;
    if (typeof val === "string" || typeof val === "number") {
      lines.push({ text: "  ".repeat(depth) + "•  " + String(val), depth });
      return;
    }
    if (Array.isArray(val)) val.forEach(v => flatten(v, depth));
    if (typeof val === "object") {
      const titleKey = ["name", "title", "type", "workflow_name"].find(k => val[k]);
      if (titleKey) lines.push({ text: String(val[titleKey]), isTitle: true });
      Object.entries(val).forEach(([k, v]) => {
        if (k === titleKey || ["id", "section_number", "section_no", "agent_id", "layer_id"].includes(k)) return;
        if (typeof v === "string" || typeof v === "number") {
          lines.push({ text: `  ${k.replace(/_/g, " ")}: ${v}`, depth: 1 });
        } else {
          flatten(v, depth + 1);
        }
      });
    }
  }

  Object.entries(section).forEach(([k, v]) => {
    if (["section_number", "section_no", "title"].includes(k)) return;
    flatten(v);
  });

  let y = 1.1;
  lines.slice(0, 20).forEach(ln => {
    if (y > 6.5) return;
    slide.addText(ln.text, {
      x: 0.2, y, w: 9.4, h: ln.isTitle ? 0.35 : 0.28,
      fontSize: ln.isTitle ? 11 : 9,
      bold: ln.isTitle,
      color: ln.isTitle ? T.accent : T.gray1,
      fontFace: "Calibri",
    });
    y += ln.isTitle ? 0.38 : 0.3;
  });

  addFooter(slide, pageNum);
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function generatePPTX(data, title = "Technical_Design") {
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_WIDE";  // 13.33" x 7.5"
  pptx.author = "AgentForgeX";
  pptx.title = title;

  let pageNum = 1;

  // Cover
  addCoverSlide(pptx, data, title, pageNum++);

  // TOC
  addTOCSlide(pptx, data, pageNum++);

  // Workflow
  addWorkflowSlide(pptx, pageNum++);

  // Sections
  (data.sections || []).forEach((section) => {
    const num = String(section.section_number || section.section_no || "");

    if (section.metrics) {
      addMetricsSlide(pptx, section.metrics, pageNum++);
      return;
    }

    if (section.stack) {
      addTechStackSlide(pptx, section.stack, pageNum++);
      return;
    }

    if (section.tools) {
      addTableSlide(pptx, `${num} Tool Ecosystem`,
        ["Tool", "Purpose", "Invoked By"],
        section.tools.map(t => [t.tool_name || "", t.purpose || "", t.invoked_by || ""]),
        pageNum++
      );
      return;
    }

    if (section.guardrails) {
      addTableSlide(pptx, `${num} Guardrails`,
        ["Rail Type", "Functions"],
        section.guardrails.map(r => [r.rail_type || "", (r.functions || []).join("; ")]),
        pageNum++
      );
      return;
    }

    if (section.memory_architecture) {
      addTableSlide(pptx, `${num} Memory Architecture`,
        ["Type", "Contents", "Storage"],
        section.memory_architecture.map(m => [
          m.memory_type || "",
          (m.contents || []).join("; "),
          (Array.isArray(m.storage) ? m.storage.join(", ") : m.storage) || "",
        ]),
        pageNum++
      );
      return;
    }

    if (section.frameworks) {
      const fw = section.frameworks;
      const allFW = [
        ...(fw.orchestration || []),
        ...(fw.rag_frameworks || []),
        ...(fw.guardrails || []),
        ...(fw.evaluation_tools || []),
      ];
      if (allFW.length) {
        addTableSlide(pptx, `${num} Frameworks & SDK`,
          ["Name", "Role / Purpose"],
          allFW.map(f => [f.name, f.role || f.purpose || ""]),
          pageNum++
        );
      }
      return;
    }

    if (section.subsections) {
      section.subsections.forEach(sub => {
        if (sub.principles) {
          addTableSlide(pptx, sub.title || "Design Principles",
            ["#", "Principle", "Application"],
            sub.principles.map(p => [String(p.id || ""), p.name || "", p.application || ""]),
            pageNum++,
            `Section ${sub.section_number || ""}`
          );
        } else if (sub.categories) {
          addTableSlide(pptx, sub.title || "Agent Categories",
            ["Type", "Description"],
            sub.categories.map(c => [c.type || "", c.description || ""]),
            pageNum++
          );
        }
      });
      return;
    }

    if (section.architecture_layers) {
      section.architecture_layers.forEach(layer => {
        if (layer.agents?.length) {
          pageNum = addAgentsSlide(pptx, layer.agents, `Layer ${layer.layer_id}: ${layer.name}`, pageNum);
        } else if (layer.rag_pipeline?.length) {
          addTableSlide(pptx, `Layer ${layer.layer_id}: RAG Pipeline`,
            ["Stage", "Name", "Components"],
            layer.rag_pipeline.map(s => [String(s.stage), s.name, (s.components || []).slice(0, 2).join("; ")]),
            pageNum++
          );
        } else if (layer.components?.length) {
          addTableSlide(pptx, `Layer ${layer.layer_id}: ${layer.name}`,
            ["Component", "Responsibilities"],
            layer.components.map(c => [c.component_name || c.name || "", (c.responsibilities || []).slice(0, 2).join("; ")]),
            pageNum++
          );
        }
      });
      return;
    }

    // Fallback generic
    addGenericSlide(pptx, section, pageNum++);
  });

  await pptx.writeFile({ fileName: `${title.replace(/\s+/g, "_")}_Report.pptx` });
}
