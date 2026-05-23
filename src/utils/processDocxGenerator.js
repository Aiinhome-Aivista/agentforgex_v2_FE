/**
 * processDocxGenerator.js — REWRITTEN (blueprint-style)
 *
 * Follows the same §0–§12 structure as processPdfGenerator.js, rendered as
 * a Word document via the `docx` library.  All structured sub-sections are
 * built from analysis data; addon sections (inventory, CSV detection, data
 * lineage) reuse the shared block renderer.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageBreak, Footer, PageOrientation,
  HeadingLevel,
} from "docx";
import { getProcessFlow } from "../services/api";
import {
  buildInventoryBlocks,
  buildCsvSourceBlocks,
  buildDataLineageBlocks,
} from "./exportSectionsAddon";
import { renderBlocksAsDocxChildren } from "./docxBlockRenderer";

/* ─── Colours ──────────────────────────────────────────────────────── */
const HEX = {
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
  green:   "16A34A",
};

/* ─── helpers ─────────────────────────────────────────────────────── */
const r = (txt, opts = {}) => new TextRun({ text: String(txt ?? ""), ...opts });
const p = (runs, opts = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing:  { before: 60, after: 60, ...(opts.spacing || {}) },
    alignment: opts.alignment,
  });

const h1 = (txt) => p(r(txt, { bold: true, color: HEX.ink, size: 32 }),
                      { spacing: { before: 320, after: 120 } });
const h2 = (txt) => p(r(txt, { bold: true, color: HEX.brandDk, size: 26 }),
                      { spacing: { before: 220, after: 100 } });
const h3 = (txt) => p(r(txt, { bold: true, color: HEX.ink, size: 22 }),
                      { spacing: { before: 160, after: 60 } });
const body  = (txt) => p(r(txt, { color: HEX.ink, size: 20 }));
const muted = (txt) => p(r(txt, { color: HEX.inkSoft, size: 19, italics: true }));
const bullet = (txt) => new Paragraph({
  children: [r(txt, { color: HEX.ink, size: 20 })],
  bullet:   { level: 0 },
  spacing:  { before: 30, after: 30 },
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => p(r(" ", { size: 4 }));

/* ─── Borders + table helpers ─────────────────────────────────────── */
const borders = (color = HEX.rule, size = 2) => ({
  top:    { style: BorderStyle.SINGLE, size, color },
  bottom: { style: BorderStyle.SINGLE, size, color },
  left:   { style: BorderStyle.SINGLE, size, color },
  right:  { style: BorderStyle.SINGLE, size, color },
});
const tableBorders = (color = HEX.rule) => ({
  ...borders(color),
  insideH: { style: BorderStyle.SINGLE, size: 2, color },
  insideV: { style: BorderStyle.SINGLE, size: 2, color },
});
const headerCell = (text, bg = HEX.navy, fg = HEX.paper) => new TableCell({
  shading: { type: "clear", fill: bg },
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  borders: borders(),
  children: [p(r(text, { bold: true, color: fg, size: 18 }))],
});
const bodyCell = (text, opts = {}) => new TableCell({
  shading: opts.bg ? { type: "clear", fill: opts.bg } : undefined,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  borders: borders(),
  children: [p(r(text, { color: opts.color || HEX.ink, size: 18, bold: opts.bold }))],
});

/* ─── §0 Cover + Exec Summary ─────────────────────────────────────── */
function buildCover(data) {
  const pr = data.process || {};
  return [
    p(r("AGENTFORGEX", { bold: true, color: HEX.brand, size: 22 }),
      { spacing: { before: 600, after: 100 } }),
    p(r("Process Agentification Platform", { color: HEX.inkSoft, size: 18 })),
    spacer(),
    p(r(pr.title || "Process Analysis Report",
        { bold: true, color: HEX.ink, size: 56 }),
      { spacing: { before: 400, after: 200 } }),
    p(r("Agentic Transformation Blueprint", { color: HEX.brandDk, size: 28 })),
    spacer(),
    muted(pr.description || ""),
    pageBreak(),
  ];
}

function buildExecutiveSummary(data) {
  const pr = data.process || {};
  const insights = data.key_insights || [];
  const targets  = data.top_automation_targets || [];

  const out = [
    h1("§0 — Executive Summary"),
    body(
      `This report analyses ${pr.title || 'the uploaded process'} and ` +
      `proposes an agentic transformation blueprint. The pipeline identified ` +
      `${(data.steps || []).length} process steps and surfaced ` +
      `${(data.suggestions || []).length} automation candidates targeting ` +
      `${pr.erp ? `the ${pr.erp} platform` : 'a multi-platform stack'}.`,
    ),
  ];

  if (insights.length) {
    out.push(h2("Key Insights"));
    insights.slice(0, 6).forEach((i) => {
      const t = typeof i === "string" ? i : (i.text || i.insight || JSON.stringify(i));
      out.push(bullet(t));
    });
  }
  if (targets.length) {
    out.push(h2("Top Automation Targets"));
    targets.slice(0, 5).forEach((t, i) => {
      const lbl = typeof t === "string" ? t : (t.title || t.name || `Target ${i + 1}`);
      const sub = typeof t === "object" ? (t.description || t.summary || "") : "";
      out.push(p([
        r(`${i + 1}. ${lbl}`, { bold: true, color: HEX.ink, size: 22 }),
        ...(sub ? [r(" — " + sub, { color: HEX.inkSoft, size: 20 })] : []),
      ]));
    });
  }
  out.push(pageBreak());
  return out;
}

/* ─── §1 System & Module Inventory ────────────────────────────────── */
function buildSystemInventory(data) {
  const inventory = buildInventoryFromAnalysis(data);
  return [
    h1("§1 — System & Module Inventory"),
    body("The inventory below is generated dynamically from the analysis pipeline plus a fallback synthesiser, guaranteeing this section is always populated."),
    ...renderBlocksAsDocxChildren(
      buildInventoryBlocks(inventory).filter((b, i) => !(i === 0 && b.type === "heading")),
    ),
    pageBreak(),
  ];
}

function buildInventoryFromAnalysis(data) {
  const erpModules = data.erp_modules || [];
  const fromBackend = erpModules.map((m) => ({
    module_name:     m.name || m.module_name || "Module",
    source_system:   m.source_system || m.erp || data.process?.erp || "ERP",
    entities:        m.entities || m.tables || [],
    responsibilities: m.responsibilities || m.functions || [],
    description:     m.description || `${m.name || "Module"} supports the process flow.`,
    context_origin:  "analysis_pipeline",
    data_flow_notes: m.data_flow || "",
  }));
  if (fromBackend.length > 0) return fromBackend;
  const erp = data.process?.erp || "ERP";
  return [
    { module_name: `${erp} Master Data`,        source_system: erp,
      entities: ["Master Records", "Reference Tables", "Configuration"],
      responsibilities: ["Maintains master data integrity", "Synchronises with downstream systems"],
      description: "Canonical reference data consumed by the workflow agents.",
      context_origin: "client_default_seed" },
    { module_name: `${erp} Transaction Engine`, source_system: erp,
      entities: ["Transactions", "Postings", "Audit Records"],
      responsibilities: ["Records process transactions", "Maintains audit trail"],
      description: "Persists every process transaction and exposes it to the agent layer.",
      context_origin: "client_default_seed" },
    { module_name: "Agent Orchestration Layer", source_system: "AgentForgeX",
      entities: ["Agent Definitions", "Workflow Graph", "Policy Bundles"],
      responsibilities: ["Coordinates specialist agents", "Applies guardrails"],
      description: "AgentForgeX's orchestration core that drives the agentic workflow.",
      context_origin: "client_default_seed" },
  ];
}

/* ─── §2 Constraint Diagnosis ────────────────────────────────────── */
function buildConstraintDiagnosis(data) {
  const steps = data.steps || [];
  const lowAuto = steps.filter((s) => (s.automation_potential ?? 0) < 40);
  const manualCount = steps.filter((s) =>
    /human|manual|user/i.test((s.actor || "") + (s.title || ""))
  ).length;
  let handoffs = 0;
  for (let i = 1; i < steps.length; i++)
    if ((steps[i].actor || "") !== (steps[i - 1].actor || "")) handoffs++;

  const out = [
    h1("§2 — Constraint Diagnosis"),
    body(
      `Throughput analysis surfaced ${lowAuto.length} low-automation-potential steps, ` +
      `${manualCount} explicitly human-driven steps, and ${handoffs} inter-actor handoffs.`,
    ),
    h2("Step-Level Bottlenecks"),
  ];
  if (lowAuto.length === 0) {
    out.push(muted("No low-automation-potential steps detected."));
  } else {
    lowAuto.slice(0, 12).forEach((s) =>
      out.push(bullet(
        `Step ${s.step_number}: ${s.title} — auto potential ${s.automation_potential ?? 0}% (actor: ${s.actor || "—"})`,
      )),
    );
  }
  out.push(pageBreak());
  return out;
}

/* ─── §3 Future-State Process ────────────────────────────────────── */
function buildFutureState() {
  const humanItems = [
    "Policy & threshold ownership",
    "Master-data approvals",
    "Exception-case judgement",
    "Regulatory sign-off",
  ];
  const autoItems = [
    "Validation & data enrichment",
    "Routine 3-way matching",
    "Status notifications",
    "Audit-log generation",
    "KPI computation & tracking",
  ];
  const maxRows = Math.max(humanItems.length, autoItems.length);
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push(new TableRow({
      children: [
        bodyCell(humanItems[i] || ""),
        bodyCell(autoItems[i] || ""),
      ],
    }));
  }
  return [
    h1("§3 — Future-State Process"),
    body("The future-state process replaces routine handoffs with agent-mediated transitions while preserving human authority over exceptions."),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("What Stays Human", HEX.amber),
            headerCell("What Becomes Autonomous", HEX.green),
          ],
        }),
        ...rows,
      ],
    }),
    pageBreak(),
  ];
}

/* ─── §4 CSV Source Detection ────────────────────────────────────── */
function buildCsvDetection(data) {
  const detections = data.process?.csv_source_detection || data.csv_source_detection || [];
  return [
    h1("§4 — CSV Source Detection"),
    ...renderBlocksAsDocxChildren(
      buildCsvSourceBlocks(detections).filter((b, i) => !(i === 0 && b.type === "heading")),
    ),
    pageBreak(),
  ];
}

/* ─── §5 Data Lineage ────────────────────────────────────────────── */
function buildDataLineage(data) {
  const pr = data.process || {};
  const lineage = pr.data_lineage || data.document_data_lineage || {
    fallback_applied: true,
    detection_method: "fallback",
    data_source: { name: "ADF (Azure Data Factory)", type: "Data Integration Service",
                   evidence: "No explicit source — ADF default applied." },
    data_target: { name: pr.erp || "Target System", type: "Operational System",
                   evidence: "Inferred from process metadata." },
  };
  return [
    h1("§5 — Document Data Lineage"),
    ...renderBlocksAsDocxChildren(
      buildDataLineageBlocks(lineage).filter((b, i) => !(i === 0 && b.type === "heading")),
    ),
    pageBreak(),
  ];
}

/* ─── §6 Agentic Workflow (rendered as a swimlane table) ─────────── */
function buildAgenticWorkflow(flow) {
  const out = [
    h1("§6 — Agentic Workflow"),
    body("The workflow below mirrors the in-app swimlane diagram, with Start and End nodes guaranteed for every flow."),
  ];

  if (!flow || !flow.lanes || flow.lanes.length === 0) {
    out.push(muted("Workflow graph could not be fetched at export time."));
    out.push(pageBreak());
    return out;
  }

  // Collect global columns sorted
  const colSet = new Set();
  flow.lanes.forEach((l) => (l.nodes || []).forEach((n) => colSet.add(n.column ?? 1)));
  const cols = Array.from(colSet).sort((a, b) => a - b);
  const colIndex = new Map();
  cols.forEach((c, i) => colIndex.set(c, i));
  const nCols = cols.length || 1;

  // Header row
  const headerCells = [headerCell("Lane", HEX.navy)];
  for (let i = 0; i < nCols; i++) headerCells.push(headerCell(`Step ${i + 1}`, HEX.brandDk));

  const rows = [new TableRow({ tableHeader: true, children: headerCells })];

  const LANE_TINTS = ["EFF6FF", "F5F3FF", "ECFDF5", "FFFBEB", "FFF1F2", "ECFEFF", "EEF2FF"];
  const LANE_INKS  = ["1D4ED8", "6D28D9", "047857", "B45309", "BE123C", "0E7490", "4338CA"];

  flow.lanes.forEach((lane, li) => {
    const tint = LANE_TINTS[li % LANE_TINTS.length];
    const accent = LANE_INKS[li % LANE_INKS.length];
    const cells = [bodyCell(lane.label || `Lane ${li + 1}`, { bg: tint, bold: true, color: accent })];
    // Index node by column
    const byCol = new Map();
    (lane.nodes || []).forEach((n) => byCol.set(n.column ?? 1, n));
    cols.forEach((c) => {
      const n = byCol.get(c);
      if (!n) {
        cells.push(bodyCell(""));
      } else {
        const t = (n.type || "process").toLowerCase();
        if (t === "start" || t === "end") {
          cells.push(bodyCell(`★ ${n.label || (t === "start" ? "Start" : "End")}`,
                              { bg: "D1FAE5", bold: true, color: "047857" }));
        } else if (t === "decision") {
          cells.push(bodyCell(`◆ ${n.label || ""}`,
                              { bg: "E0E7FF", bold: true, color: "3730A3" }));
        } else {
          cells.push(bodyCell(n.label || "", { bg: tint, color: accent }));
        }
      }
    });
    rows.push(new TableRow({ children: cells }));
  });

  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows,
  }));

  // Flow edges as appendix
  if (flow.flow?.length) {
    out.push(h3("Flow Connections"));
    flow.flow.forEach((e) =>
      out.push(bullet(`${e.from}  →  ${e.to}${e.label ? `  (${e.label})` : ''}`)),
    );
  }
  out.push(pageBreak());
  return out;
}

/* ─── §7 Architecture & BOM ──────────────────────────────────────── */
function buildArchitectureBom(data) {
  const pr = data.process || {};
  const layers = [
    ["Presentation",    "React UI, dashboards, chatbot"],
    ["Ingress",         "API Gateway, schema validation, access control"],
    ["Orchestration",   "Plan-and-Execute orchestrator + policy bundles"],
    ["Agentic Core",    "Specialist agents (validation, fraud, payment, tracking)"],
    ["Knowledge Layer", "ArangoDB graph + Vector store + Decision log"],
    ["Data Plane",      `${pr.erp || "ERP"} adapters + ADF data integration`],
  ];
  const bom = [
    "Orchestration framework (LangGraph) — production-grade",
    "Specialist agents (LangChain wrappers)",
    "Vector & metadata stores (ChromaDB + MySQL)",
    `${pr.erp || "ERP"} connectors and adapters`,
    "Observability stack (OpenTelemetry + dashboards)",
    "Decision log and audit-trail store",
  ];
  return [
    h1("§7 — Architecture & Bill of Materials"),
    body("Layered architecture: ingress → orchestration → specialist agents → controlled outputs."),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Layer"), headerCell("Components")] }),
        ...layers.map(([k, v]) => new TableRow({ children: [bodyCell(k, { bold: true, color: HEX.navy }), bodyCell(v)] })),
      ],
    }),
    h2("Bill of Materials"),
    ...bom.map(bullet),
    pageBreak(),
  ];
}

/* ─── §8 Operating Model & Governance ────────────────────────────── */
function buildOperatingGovernance() {
  return [
    h1("§8 — Operating Model & Governance"),
    h2("RACI Highlights"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell(""), headerCell("Who"), headerCell("What")] }),
        new TableRow({ children: [bodyCell("R", { bold: true, bg: HEX.surface }), bodyCell("Specialist Agents"), bodyCell("Routine cases inside the policy envelope")] }),
        new TableRow({ children: [bodyCell("A", { bold: true, bg: HEX.surface }), bodyCell("Process Manager"),    bodyCell("Policy, thresholds, and exception SLAs")] }),
        new TableRow({ children: [bodyCell("C", { bold: true, bg: HEX.surface }), bodyCell("Compliance / Audit"), bodyCell("Escalations and decision-log reviews")] }),
        new TableRow({ children: [bodyCell("I", { bold: true, bg: HEX.surface }), bodyCell("Stakeholders"),       bodyCell("Status notifications + KPI dashboards")] }),
      ],
    }),
    h2("Governance Controls"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Gate"), headerCell("Control")] }),
        new TableRow({ children: [bodyCell("Input validation",   { bold: true }), bodyCell("Schema + policy check on every inbound case.")] }),
        new TableRow({ children: [bodyCell("Decision provenance",{ bold: true }), bodyCell("Every agent decision logged with prompts + tool calls.")] }),
        new TableRow({ children: [bodyCell("Human override",     { bold: true }), bodyCell("All escalations carry an SLA and reassignment path.")] }),
        new TableRow({ children: [bodyCell("Rollback",           { bold: true }), bodyCell("Single env-var flip reverts to manual processing.")] }),
      ],
    }),
    pageBreak(),
  ];
}

/* ─── §9 Deployment Plan ─────────────────────────────────────────── */
function buildDeploymentPlan() {
  const phases = [
    ["Discover",  "1–2",   "Confirm scope and constraints with stakeholders."],
    ["Diagnose",  "3–4",   "Quantify baseline KPIs and rank failure modes."],
    ["Design",    "5–6",   "Lock agent graph, policies, and guardrails."],
    ["Generate",  "7–8",   "Ship the scaffold (code + config) into staging."],
    ["Pilot",     "9–10",  "Run synthetic cases end-to-end; Steerco decision."],
    ["Rollout",   "11–14", "Expand to next slice with rollback toggle ready."],
  ];
  return [
    h1("§9 — Deployment Plan"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Phase"), headerCell("Days"), headerCell("Outcome")] }),
        ...phases.map(([ph, dys, out]) => new TableRow({
          children: [bodyCell(ph, { bold: true, color: HEX.navy }), bodyCell(dys), bodyCell(out)],
        })),
      ],
    }),
    pageBreak(),
  ];
}

/* ─── §10 KPI Targets ────────────────────────────────────────────── */
function buildKpiTargets() {
  const kpis = [
    ["Cycle time (mean)",      "—", "-50%",  "Touchless flow eliminates handoffs"],
    ["Touchless rate",         "—", "≥70%",  "Routine cases flow without humans"],
    ["Exception backlog",      "—", "-40%",  "Earlier routing of the right cases"],
    ["Decision auditability",  "—", "100%",  "Every decision has a log entry"],
    ["Rollback time",          "—", "<5 min","Single config toggle to manual mode"],
  ];
  return [
    h1("§10 — KPI Targets & Success Criteria"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [
          headerCell("Metric"), headerCell("Baseline"), headerCell("Target"), headerCell("Rationale"),
        ] }),
        ...kpis.map(([m, b, t, r]) => new TableRow({
          children: [
            bodyCell(m, { bold: true, color: HEX.navy }),
            bodyCell(b),
            bodyCell(t, { bold: true, color: HEX.green }),
            bodyCell(r),
          ],
        })),
      ],
    }),
    pageBreak(),
  ];
}

/* ─── §11 Self-Improvement Loops ─────────────────────────────────── */
function buildSelfImprovement() {
  const loops = [
    ["Threshold tuning",    "Auto-approval rate vs exception cost"],
    ["Anomaly retraining",  "Fraud and outlier detection accuracy"],
    ["Prompt / policy diff","Agent reasoning consistency over time"],
    ["KPI feedback",        "Cycle time, touchless rate, backlog drift"],
  ];
  return [
    h1("§11 — Self-Improvement Loops"),
    ...loops.map(([n, w]) => p([
      r(`Loop — ${n}`,    { bold: true, color: HEX.brandDk, size: 22 }),
      r(`\nOptimises: ${w}`, { color: HEX.ink, size: 20 }),
    ])),
    pageBreak(),
  ];
}

/* ─── §12 Recommendations + Appendix ─────────────────────────────── */
function buildRecommendations(data) {
  const recs = [
    "Pilot on a single high-volume slice before scaling laterally.",
    "Treat thresholds and policies as configuration, not code.",
    "Keep the manual path warm so rollback is a config flip.",
    "Instrument the decision log first — visibility unlocks tuning.",
    "Track DSO / cycle-time deltas weekly during the pilot.",
  ];
  const out = [
    h1("§12 — Recommendations & Appendix"),
    h2("Recommendations"),
    ...recs.map(bullet),
  ];

  const steps = data.steps || [];
  if (steps.length > 0) {
    out.push(h2("Appendix A — All Process Steps"));
    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders(),
      rows: [
        new TableRow({ tableHeader: true, children: [
          headerCell("#"), headerCell("Step Title"), headerCell("Actor"),
          headerCell("Auto %"), headerCell("Score"),
        ] }),
        ...steps.map((s, i) => new TableRow({
          children: [
            bodyCell(String(s.step_number ?? i + 1)),
            bodyCell(String(s.title || ""), { bold: true }),
            bodyCell(String(s.actor || "—")),
            bodyCell(`${s.automation_potential ?? 0}%`),
            bodyCell(String(s.automation_score ?? "—"), { bold: true, color: HEX.brand }),
          ],
        })),
      ],
    }));
  }
  return out;
}

/* ─── PUBLIC: generateProcessDOCX ─────────────────────────────────── */
export async function generateProcessDOCX(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessDOCX: invalid data payload");
  }

  // Fetch workflow lazily; tolerate failure
  let flowData = null;
  try {
    const flow = await getProcessFlow(data.process._key || data.process.id);
    flowData = (flow && flow.data) || flow;
  } catch (e) {
    console.warn("[processDocxGenerator] workflow fetch failed:", e);
  }

  const footer = new Footer({
    children: [
      p(r("AgentForgeX  |  Confidential – AI-Generated Process Analysis Blueprint",
          { color: HEX.inkSoft, size: 16 }),
        { alignment: AlignmentType.CENTER }),
    ],
  });

  const allChildren = [
    ...buildCover(data),
    ...buildExecutiveSummary(data),
    ...buildSystemInventory(data),
    ...buildConstraintDiagnosis(data),
    ...buildFutureState(),
    ...buildCsvDetection(data),
    ...buildDataLineage(data),
    ...buildAgenticWorkflow(flowData),
    ...buildArchitectureBom(data),
    ...buildOperatingGovernance(),
    ...buildDeploymentPlan(),
    ...buildKpiTargets(),
    ...buildSelfImprovement(),
    ...buildRecommendations(data),
  ];

  const doc = new Document({
    creator: "AgentForgeX",
    title:   data.process.title || "Process Blueprint",
    description: "Auto-generated Agentic Process Blueprint",
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
  a.download = `${(data.process.title || "Process").replace(/[^a-z0-9_-]+/gi, "_")}_Blueprint.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
