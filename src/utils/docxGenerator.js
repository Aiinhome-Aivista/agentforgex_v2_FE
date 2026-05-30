/**
 * docxGenerator.js — AgentForgeX
 *
 * Enterprise-grade technical-design DOCX using the `docx` library.
 * White paper theme. The "Agentic Process Workflow" is rendered as a true
 * swimlane: one row per lane, columns aligned across lanes, with cells
 * tinted to match each lane's accent colour.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  WidthType, PageBreak, Footer, PageOrientation, LevelFormat,
} from "docx";
import { layoutWorkflow, hasFlowData, LANE_ACCENTS } from "./workflowRenderer";

// ─── Colours (no '#' for docx) ───────────────────────────────────────────────
const HEX = {
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

// ─── Paragraph factories ─────────────────────────────────────────────────────

function p(runs, opts = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing: { before: 60, after: 60, ...(opts.spacing || {}) },
    alignment: opts.alignment,
    indent: opts.indent,
  });
}

function run(text, opts = {}) { return new TextRun({ text: String(text ?? ""), ...opts }); }
function h1(text) { return p(run(text, { bold: true, color: HEX.ink, size: 32 }), { spacing: { before: 200, after: 120 } }); }
function h2(text) { return p(run(text, { bold: true, color: HEX.brandDk, size: 26 }), { spacing: { before: 200, after: 100 } }); }
function h3(text) { return p(run(text, { bold: true, color: HEX.ink, size: 22 }), { spacing: { before: 160, after: 60 } }); }
function body(text, opts = {}) { return p(run(text, { color: HEX.ink, size: 20, ...opts }), { spacing: { before: 40, after: 40 } }); }
function muted(text) { return p(run(text, { color: HEX.inkSoft, size: 19 }), { spacing: { before: 30, after: 30 } }); }
function bullet(text, level = 0) {
  return new Paragraph({
    children: [run(text, { color: HEX.ink, size: 20 })],
    bullet: { level },
    spacing: { before: 30, after: 30 },
  });
}
function labelValue(label, value) {
  return p([
    run(label + ": ", { bold: true, color: HEX.brand, size: 19 }),
    run(value ?? "—", { color: HEX.ink, size: 19 }),
  ]);
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer(size = 200) { return new Paragraph({ children: [], spacing: { before: size, after: 0 } }); }

// ─── Table factory ───────────────────────────────────────────────────────────

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

function headerCell(text, bg = HEX.navy, fg = HEX.paper) {
  return new TableCell({
    children: [p(run(text, { bold: true, color: fg, size: 18 }))],
    shading: { type: ShadingType.SOLID, color: bg },
    borders: borders(HEX.navy),
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  });
}

function dataCell(text, shade = null, opts = {}) {
  return new TableCell({
    children: [p(run(text, { color: opts.color || HEX.ink, size: 18, bold: !!opts.bold }))],
    shading: shade ? { type: ShadingType.SOLID, color: shade } : undefined,
    borders: borders(HEX.rule),
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: opts.verticalAlign,
  });
}

function buildTable(headers, rows, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    columnWidths: opts.columnWidths,
    rows: [
      new TableRow({
        children: headers.map((h) => headerCell(h, opts.headerBg, opts.headerFg)),
        tableHeader: true,
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell) => dataCell(cell, ri % 2 === 0 ? HEX.surface : HEX.paper)),
        })
      ),
    ],
  });
}

// ─── Cover section ───────────────────────────────────────────────────────────

function buildCover(data, titleArg) {
  const cp = data.cover_page || data.document_metadata || {};
  const docTitle = (cp.title || titleArg || "Technical Design Document").trim();

  return [
    // Brand header
    p([run("AgentForgeX", { bold: true, color: HEX.brand, size: 36 })], { spacing: { before: 0, after: 80 } }),
    p([run("POWERED BY AGENTIC AI", { color: HEX.brand, size: 16 })], { spacing: { before: 0, after: 400 } }),

    // Doc type
    p([run((cp.document_type || "TECHNICAL DESIGN DOCUMENT").toUpperCase(), { bold: true, color: HEX.brandDk, size: 22 })],
      { spacing: { before: 400, after: 200 } }),

    // Title (NO suffix concatenation — uses cp.title verbatim)
    p([run(docTitle, { bold: true, color: HEX.ink, size: 56 })], { spacing: { before: 0, after: 200 } }),

    // Subtitle
    cp.subtitle ? p([run(cp.subtitle, { color: HEX.inkSoft, size: 28 })], { spacing: { before: 0, after: 600 } }) : spacer(200),

    // Accent rule
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: HEX.brand } },
      spacing: { before: 200, after: 400 },
      children: [],
    }),

    // Metadata grid (single table row, four cells)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          children: ["DATE", "VERSION", "ORGANIZATION", "CLASSIFICATION"].map((l) =>
            new TableCell({
              children: [p(run(l, { bold: true, color: HEX.brand, size: 16 }))],
              shading: { type: ShadingType.SOLID, color: HEX.surface },
              borders: borders(HEX.rule),
              margins: { top: 120, bottom: 80, left: 140, right: 140 },
            })
          ),
        }),
        new TableRow({
          children: [
            cp.date || "—",
            cp.version || "Draft V1.0",
            "AgentForge",
            "Confidential",
          ].map((v) =>
            new TableCell({
              children: [p(run(v, { bold: true, color: HEX.ink, size: 22 }))],
              borders: borders(HEX.rule),
              margins: { top: 80, bottom: 160, left: 140, right: 140 },
            })
          ),
        }),
      ],
    }),

    spacer(800),
    p([run("Generated by AgentForgeX  |  AI-Powered Technical Design Platform", { color: HEX.inkMuted, size: 15 })],
      { alignment: AlignmentType.CENTER }),
    pageBreak(),
  ];
}

// ─── TOC (derived from sections[], not from data.table_of_contents) ──────────

function buildTOC(data) {
  const isAddonSection = (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return (
      t.includes("system and module inventory") ||
      t.includes("system & module inventory") ||
      t.includes("csv source") ||
      t.includes("document data lineage") ||
      t.includes("agentic suggestion blueprint") ||
      t.includes("per-suggestion blueprint")
    );
  };

  // 1. Agentic Process Workflow (Manual first entry)
  const items = [
    ["01", "Agentic Process Workflow"],
    ...(data.sections || []).filter(s => !isAddonSection(s.title)).map((s, i) => [
      String(i + 2).padStart(2, "0"),
      s.title || "",
    ])
  ];

  return [
    p([run("Table of Contents", { bold: true, color: HEX.ink, size: 36 })],
      { spacing: { before: 0, after: 240 } }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: HEX.brand } },
      spacing: { before: 0, after: 240 },
      children: [],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(HEX.rule),
      columnWidths: [800, 8000],
      rows: items.map(([num, title], i) =>
        new TableRow({
          children: [
            new TableCell({
              children: [p(run(num, { bold: true, color: HEX.brand, size: 22 }))],
              borders: borders(HEX.rule),
              margins: { top: 100, bottom: 100, left: 160, right: 100 },
            }),
            new TableCell({
              children: [p(run(title, { color: HEX.ink, size: 22 }))],
              borders: borders(HEX.rule),
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
            }),
          ],
        })
      ),
    }),
    pageBreak(),
  ];
}

// ─── Real swimlane workflow (multi-row table) ────────────────────────────────

function buildWorkflowSection(flowData) {
  const heading = h2("Agentic Process Workflow");
  const subhead = muted("Operating Model: Agentic Operations  •  End-to-end business process flow");

  if (!hasFlowData(flowData)) {
    return [
      heading,
      subhead,
      body("Process flow data not available for this analysis.", { italics: true, color: HEX.inkSoft }),
      pageBreak(),
    ];
  }

  const layout = layoutWorkflow(flowData);
  // Build a logical column → physical-column index map. Each unique used column
  // becomes one table column. Lane label sits in the first table column.
  const usedColsSet = new Set();
  layout.nodes.forEach((n) => usedColsSet.add(n.col));
  const usedCols = Array.from(usedColsSet).sort((a, b) => a - b);
  const colIndexMap = new Map();
  usedCols.forEach((c, i) => colIndexMap.set(c, i));
  const numCols = usedCols.length;

  // Build cell grid: rows = lanes; columns = [lane-label, c1..cN]
  const cells = layout.lanes.map((lane) => {
    const row = Array(numCols + 1).fill(null);
    row[0] = { kind: "lane-label", lane };
    return row;
  });

  layout.nodes.forEach((n) => {
    const li = n.laneIndex;
    const ci = (colIndexMap.get(n.col) ?? 0) + 1;
    cells[li][ci] = { kind: "node", node: n, lane: layout.lanes[li] };
  });

  // Build table rows
  const rows = cells.map((row) =>
    new TableRow({
      height: { value: 900, rule: "atLeast" },
      children: row.map((c) => {
        if (!c) {
          return new TableCell({
            children: [p(run(""))],
            borders: borders(HEX.rule),
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
          });
        }
        if (c.kind === "lane-label") {
          const accentBare = stripHash(c.lane.accent);
          const tintBare = stripHash(c.lane.tint);
          return new TableCell({
            children: [p(run(c.lane.label, { bold: true, color: stripHash(c.lane.text), size: 18 }))],
            shading: { type: ShadingType.SOLID, color: tintBare },
            borders: {
              ...borders(HEX.rule),
              left: { style: BorderStyle.SINGLE, size: 24, color: accentBare },
            },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            verticalAlign: "center",
          });
        }
        // node cell
        const n = c.node;
        const lane = c.lane;
        let fillBare, textColor, label;
        if (n.type === "start" || n.type === "end") {
          fillBare = "D1FAE5"; textColor = "047857"; label = `▶ ${n.label}`;
        } else if (n.type === "decision") {
          fillBare = "E0E7FF"; textColor = "3730A3"; label = `◆ ${n.label}`;
        } else {
          fillBare = stripHash(lane.tint); textColor = HEX.ink; label = n.label;
        }
        return new TableCell({
          children: [p(run(label, { color: textColor, size: 17, bold: n.type !== "process" }))],
          shading: { type: ShadingType.SOLID, color: fillBare },
          borders: {
            ...borders(HEX.rule),
            left: { style: BorderStyle.SINGLE, size: 12, color: stripHash(lane.accent) },
          },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          verticalAlign: "center",
        });
      }),
    })
  );

  // Header row showing column numbers (Step 1, Step 2, ...)
  const headerCells = [
    new TableCell({
      children: [p(run("Lane / Step", { bold: true, color: HEX.paper, size: 18 }))],
      shading: { type: ShadingType.SOLID, color: HEX.navy },
      borders: borders(HEX.navy),
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
    }),
    ...usedCols.map((_, i) =>
      new TableCell({
        children: [p(run(`Step ${i + 1}`, { bold: true, color: HEX.paper, size: 17 }), { alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: HEX.navy },
        borders: borders(HEX.navy),
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
      })
    ),
  ];

  const swimlaneTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(HEX.rule),
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...rows],
  });

  // Flow summary (edges textual)
  const flowItems = layout.edges
    .map((e) => {
      const fromNode = layout.nodes.find((n) => n.id === e.fromId);
      const toNode = layout.nodes.find((n) => n.id === e.toId);
      if (!fromNode || !toNode) return null;
      const lbl = e.label ? ` [${e.label}]` : "";
      return `${fromNode.label} → ${toNode.label}${lbl}`;
    })
    .filter(Boolean);

  return [
    heading,
    subhead,
    p([run(layout.title, { bold: true, color: HEX.ink, size: 22 })], { spacing: { before: 120, after: 120 } }),
    swimlaneTable,
    spacer(200),
    h3("Process Flow Sequence"),
    ...flowItems.map((f) => bullet(f)),
    pageBreak(),
  ];
}

// ─── Section renderers ───────────────────────────────────────────────────────

function renderExecutiveSummary(section) {
  const c = section.content || {};
  const items = [];
  if (c.purpose) { items.push(h3("Purpose")); items.push(body(c.purpose)); }
  if (c.problem_statement) { items.push(h3("Problem Statement")); items.push(body(c.problem_statement)); }
  if (c.design_philosophy?.statement) {
    items.push(h3("Design Philosophy"));
    items.push(body(c.design_philosophy.statement, { italics: true }));
  }
  if (Array.isArray(c.primary_goals) && c.primary_goals.length) {
    items.push(h3("Primary Goals"));
    c.primary_goals.forEach((g) => items.push(bullet(g)));
  }
  return items;
}

function renderArchitectureLayer(layer) {
  const items = [h3(`Layer ${layer.layer_id}: ${layer.name || ""}`)];

  if (Array.isArray(layer.agents) && layer.agents.length) {
    items.push(p([run("AI Agents", { bold: true, color: HEX.brand, size: 22 })], { spacing: { before: 120, after: 80 } }));
    items.push(buildTable(
      ["#", "Name", "Role", "Framework", "Model Tier"],
      layer.agents.map((a) => [
        String(a.agent_id || ""),
        a.name || "",
        a.role || "",
        a.reasoning_framework || "",
        a.model_tier || "",
      ])
    ));
    items.push(spacer(120));
  }
  if (Array.isArray(layer.components) && layer.components.length) {
    items.push(p([run("Components", { bold: true, color: HEX.brand, size: 22 })], { spacing: { before: 120, after: 80 } }));
    items.push(buildTable(
      ["Component", "Responsibilities"],
      layer.components.map((c) => [
        c.component_name || c.name || "",
        Array.isArray(c.responsibilities) ? c.responsibilities.join("; ") : (c.responsibilities || ""),
      ])
    ));
    items.push(spacer(120));
  }
  if (Array.isArray(layer.rag_pipeline) && layer.rag_pipeline.length) {
    items.push(p([run("RAG Pipeline", { bold: true, color: HEX.brand, size: 22 })], { spacing: { before: 120, after: 80 } }));
    items.push(buildTable(
      ["Stage", "Name", "Components"],
      layer.rag_pipeline.map((s) => [
        String(s.stage),
        s.name || "",
        Array.isArray(s.components) ? s.components.join("; ") : (s.components || ""),
      ])
    ));
    items.push(spacer(120));
  }
  return items;
}

function renderFrameworks(fw) {
  const items = [];
  const groups = [
    ["Orchestration", fw.orchestration],
    ["RAG Frameworks", fw.rag_frameworks],
    ["Guardrails", fw.guardrails],
    ["Evaluation Tools", fw.evaluation_tools],
    ["Protocols", fw.protocols],
  ];
  groups.forEach(([label, list]) => {
    if (!Array.isArray(list) || !list.length) return;
    items.push(h3(label));
    items.push(buildTable(
      ["Name", "Role / Purpose"],
      list.map((it) => [it.name || "", it.role || it.purpose || ""])
    ));
    items.push(spacer(80));
  });
  return items;
}

function renderTools(tools) {
  return [buildTable(
    ["Tool", "Purpose", "Invoked By"],
    tools.map((t) => [t.tool_name || t.name || "", t.purpose || "", t.invoked_by || ""])
  )];
}

function renderGuardrails(rails, observability) {
  const items = [];
  items.push(buildTable(
    ["Rail Type", "Functions"],
    rails.map((r) => [r.rail_type || "", (r.functions || []).join("; ")])
  ));
  if (observability) {
    items.push(spacer(160));
    items.push(h3("Observability"));
    Object.entries(observability).forEach(([k, v]) =>
      items.push(labelValue(k.replace(/_/g, " "), Array.isArray(v) ? v.join(", ") : String(v)))
    );
  }
  return items;
}

function renderMetrics(metrics) {
  return [buildTable(
    ["Metric", "Target"],
    metrics.map((m) => [m.metric || "", m.target || ""])
  )];
}

function renderMemory(mems, critical) {
  const items = [];
  items.push(buildTable(
    ["Memory Type", "Contents", "Storage"],
    mems.map((m) => [
      m.memory_type || "",
      Array.isArray(m.contents) ? m.contents.join("; ") : (m.contents || ""),
      Array.isArray(m.storage) ? m.storage.join(", ") : (m.storage || ""),
    ])
  ));
  if (Array.isArray(critical) && critical.length) {
    items.push(spacer(120));
    items.push(h3("Critical Practices"));
    critical.forEach((c) => items.push(bullet(c)));
  }
  return items;
}

function renderStack(stack) {
  return [buildTable(
    ["Layer", "Technologies"],
    Object.entries(stack).map(([k, v]) => [
      k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      Array.isArray(v) ? v.join(", ") : String(v),
    ]),
    { columnWidths: [2500, 7500] }
  )];
}

function renderWorkflows(workflows) {
  const items = [];
  workflows.forEach((wf, i) => {
    items.push(h3(`${i + 1}. ${wf.workflow_name || wf.name || ""}`));
    if (wf.description) items.push(body(wf.description));
    if (Array.isArray(wf.steps) && wf.steps.length) {
      wf.steps.forEach((s, si) =>
        items.push(bullet(`${si + 1}. ${typeof s === "string" ? s : (s.label || s.name || "")}`))
      );
    }
    items.push(spacer(120));
  });
  return items;
}

function renderReportStructure(items) {
  return items.map((it, i) => bullet(`${String(i + 1).padStart(2, "0")}. ${it}`));
}

function renderSubsections(subsections) {
  const items = [];
  subsections.forEach((sub) => {
    items.push(h3(`${sub.section_number || ""} ${sub.title || ""}`));
    if (Array.isArray(sub.principles)) {
      items.push(buildTable(
        ["#", "Principle", "Application"],
        sub.principles.map((pr) => [String(pr.id || ""), pr.name || "", pr.application || ""])
      ));
    }
    if (Array.isArray(sub.categories)) {
      items.push(buildTable(
        ["Type", "Description"],
        sub.categories.map((c) => [c.type || "", c.description || ""])
      ));
    }
    items.push(spacer(120));
  });
  return items;
}

function renderSection(section, index) {
  const num = String(index + 2).padStart(2, "0");
  const items = [
    p([run(num, { bold: true, color: HEX.brand, size: 48 }), run("  " + (section.title || ""), { bold: true, color: HEX.ink, size: 32 })],
      { spacing: { before: 0, after: 200 } }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: HEX.brand } },
      spacing: { before: 0, after: 240 },
      children: [],
    }),
  ];

  if (section.architecture_layers) { section.architecture_layers.forEach((l) => items.push(...renderArchitectureLayer(l))); items.push(pageBreak()); return items; }
  if (section.subsections) { items.push(...renderSubsections(section.subsections)); items.push(pageBreak()); return items; }
  if (section.frameworks) { items.push(...renderFrameworks(section.frameworks)); items.push(pageBreak()); return items; }
  if (section.tools) { items.push(...renderTools(section.tools)); items.push(pageBreak()); return items; }
  if (section.guardrails) { items.push(...renderGuardrails(section.guardrails, section.observability)); items.push(pageBreak()); return items; }
  if (section.metrics) { items.push(...renderMetrics(section.metrics)); items.push(pageBreak()); return items; }
  if (section.memory_architecture) { items.push(...renderMemory(section.memory_architecture, section.critical_practices)); items.push(pageBreak()); return items; }
  if (section.stack) { items.push(...renderStack(section.stack)); items.push(pageBreak()); return items; }
  if (section.workflows) { items.push(...renderWorkflows(section.workflows)); items.push(pageBreak()); return items; }
  if (section.report_structure) { items.push(...renderReportStructure(section.report_structure)); items.push(pageBreak()); return items; }

  if (section.content) {
    if (section.section_number === 1 || /executive/i.test(section.title || "")) {
      items.push(...renderExecutiveSummary(section));
    } else {
      items.push(...flattenContent(section.content));
    }
  }
  items.push(pageBreak());
  return items;
}

function flattenContent(val, depth = 0) {
  if (!val) return [];
  const out = [];
  if (typeof val === "string" || typeof val === "number") {
    out.push(body(String(val)));
    return out;
  }
  if (Array.isArray(val)) {
    val.forEach((v) => {
      if (typeof v === "string" || typeof v === "number") out.push(bullet(String(v), depth));
      else out.push(...flattenContent(v, depth + 1));
    });
    return out;
  }
  if (typeof val === "object") {
    Object.entries(val).forEach(([k, v]) => {
      out.push(p([run(k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), { bold: true, color: HEX.brandDk, size: 21 })],
        { spacing: { before: 100, after: 60 } }));
      out.push(...flattenContent(v, depth + 1));
    });
  }
  return out;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateDOCX(data, title = "Technical_Design", flowData = null) {
  const footer = new Footer({
    children: [
      p([run("AgentForgeX  |  Confidential – AI-Generated Technical Design", { color: HEX.inkSoft, size: 16 })],
        { alignment: AlignmentType.CENTER }),
    ],
  });

  const isAddonSection = (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return (
      t.includes("system and module inventory") ||
      t.includes("system & module inventory") ||
      t.includes("csv source") ||
      t.includes("document data lineage") ||
      t.includes("agentic suggestion blueprint") ||
      t.includes("per-suggestion blueprint")
    );
  };

  const filteredSections = (data.sections || []).filter(s => !isAddonSection(s.title));

  const allChildren = [
    ...buildCover(data, title),
    ...buildTOC(data),
    ...buildWorkflowSection(flowData),
    ...filteredSections.flatMap((s, i) => renderSection(s, i)),
  ];

  const doc = new Document({
    creator: "AgentForgeX",
    title,
    description: "AI-Generated Technical Design Document",
    styles: { default: { document: { run: { font: "Calibri", color: HEX.ink } } } },
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
  a.download = `${title.replace(/[^a-z0-9_-]+/gi, "_")}_Report.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
