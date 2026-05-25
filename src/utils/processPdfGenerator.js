/**
 * processPdfGenerator.js — REWRITTEN (blueprint-style)
 *
 * Drives the "Export Analysis" button on AnalysisPage.  The PDF now follows
 * the structure of AgentForge_P2P_Agentic_Blueprint.docx:
 *
 *   §0  Executive Summary
 *   §1  System & Module Inventory   (NEW — spec section 1)
 *   §2  Constraint Diagnosis
 *   §3  Future-State Process
 *   §4  CSV Source Detection        (NEW — spec section 2)
 *   §5  Document Data Lineage       (NEW — spec section 2, ADF fallback)
 *   §6  Agentic Workflow Graph      (with Start & End nodes — spec section 4)
 *   §7  Architecture & BOM
 *   §8  Operating Model & Governance
 *   §9  Deployment Plan
 *   §10 KPIs / Success Criteria
 *   §11 Self-Improvement Loops
 *   §12 Recommendations / Appendix
 *
 * Input shape (`data`):
 *   {
 *     process: {
 *       _key, title, description, erp,
 *       // populated by the upload pipeline:
 *       csv_source_detection?: [...],
 *       data_lineage?:        {...},
 *     },
 *     steps:        [...],
 *     suggestions:  [...],
 *     erp_modules:  [...],
 *     key_insights: [...],
 *     top_automation_targets: [...],
 *   }
 */

import jsPDF from "jspdf";
import {
  buildInventoryBlocks,
  buildCsvSourceBlocks,
  buildDataLineageBlocks,
} from "./exportSectionsAddon";
import { renderBlocks, DEFAULT_PALETTE }
  from "./pdfBlockRenderer";

/* ─── Palette ─────────────────────────────────────────────────────────── */
const C = {
  ...DEFAULT_PALETTE,
  red:    [220, 38, 38],
  green:  [22, 163, 74],
};

const PW = 210, PH = 297;
const ML = 18, MR = 18, MTop = 22, MBot = 18;
const CW = PW - ML - MR;

const PALETTE_FOR_BLOCKS = {
  navy: C.navy, accent: C.accent, amber: C.amber, blue: C.blue,
  ink: C.ink, gray1: C.gray1, gray2: C.gray2, gray3: C.gray3,
  gray4: C.gray4, border: C.border, surface: C.surface,
};
const BLOCK_OPTS = { ML, MR, PW, PH, MBot };

/* ─── Drawing helpers ─────────────────────────────────────────────────── */
const fill   = (d, c) => d.setFillColor(...c);
const stroke = (d, c) => d.setDrawColor(...c);
const ink    = (d, c) => d.setTextColor(...c);
const setFont = (d, w = "normal", s = 10) => { d.setFontSize(s); d.setFont("helvetica", w); };
const text = (d, s, x, y, o) => { if (s != null) d.text(String(s), x, y, o); };

function strokeRect(d, x, y, w, h, color, lw = 0.2, r = 0) {
  stroke(d, color); d.setLineWidth(lw);
  if (r > 0) d.roundedRect(x, y, w, h, r, r, "S");
  else       d.rect(x, y, w, h, "S");
}

function drawPageHeader(d, title, subtitle) {
  fill(d, C.surface);
  d.rect(0, 0, PW, 14, "F");
  setFont(d, "bold", 9);
  ink(d, C.accent);
  text(d, "AGENTFORGEX  •  PROCESS ANALYSIS REPORT", ML, 9);
  if (subtitle) {
    setFont(d, "normal", 8);
    ink(d, C.gray2);
    text(d, subtitle, PW - MR, 9, { align: "right" });
  }
  stroke(d, C.accent); d.setLineWidth(0.6);
  d.line(ML, 14, PW - MR, 14);
}

function drawPageFooter(d) {
  const total = d.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    d.setPage(i);
    stroke(d, C.border); d.setLineWidth(0.2);
    d.line(ML, PH - 14, PW - MR, PH - 14);
    setFont(d, "normal", 8);
    ink(d, C.gray2);
    text(d, "© AgentForgeX  |  AI-Generated Process Analysis", ML, PH - 8);
    text(d, `${i} / ${total}`, PW - MR, PH - 8, { align: "right" });
  }
}

function newSectionPage(d, title, sectionNumber, subtitle) {
  d.addPage("a4", "portrait");
  drawPageHeader(d, title, subtitle);

  fill(d, C.accent);
  d.rect(ML, 22, 6, 6, "F");
  setFont(d, "bold", 8);
  ink(d, [255, 255, 255]);
  text(d, `§${sectionNumber}`, ML + 3, 26.5, { align: "center" });

  setFont(d, "bold", 18);
  ink(d, C.navy);
  text(d, title, ML + 10, 27);

  if (subtitle) {
    setFont(d, "italic", 9.5);
    ink(d, C.gray2);
    text(d, subtitle, ML + 10, 33);
  }

  stroke(d, C.accent); d.setLineWidth(0.5);
  d.line(ML, 36, PW - MR, 36);

  return 44;
}

function wrap(d, str, x, y, maxW, { size = 10, color = C.ink, weight = "normal", lineH = 5 } = {}) {
  setFont(d, weight, size);
  ink(d, color);
  const lines = d.splitTextToSize(String(str ?? ""), maxW);
  lines.forEach((ln, i) => text(d, ln, x, y + i * lineH));
  return y + lines.length * lineH;
}

function pageBreakIfNeeded(d, y, needed, title, sectionNumber, subtitle) {
  if (y + needed <= PH - MBot - 4) return y;
  return newSectionPage(d, `${title} (cont.)`, sectionNumber, subtitle);
}

/* ─── Cover page ─────────────────────────────────────────────────────── */
function drawCover(d, data) {
  const p = data.process || {};
  fill(d, C.navy);
  d.rect(0, 0, PW, PH, "F");
  fill(d, C.accent);
  d.rect(0, 0, PW, 4, "F");

  setFont(d, "bold", 9);
  ink(d, C.accent);
  text(d, "AGENTFORGEX", ML, 22);
  setFont(d, "normal", 8);
  ink(d, [148, 163, 184]);
  text(d, "Process Agentification Platform", ML, 27);

  fill(d, C.accent);
  d.rect(ML, 70, 50, 1.5, "F");

  setFont(d, "bold", 28);
  ink(d, [255, 255, 255]);
  const titleLines = d.splitTextToSize(p.title || "Process Analysis Report", CW);
  titleLines.forEach((ln, i) => text(d, ln, ML, 84 + i * 11));

  setFont(d, "normal", 14);
  ink(d, [203, 213, 225]);
  text(d, "Agentic Transformation Blueprint", ML, 84 + titleLines.length * 11 + 8);

  // Description
  if (p.description) {
    setFont(d, "italic", 10);
    ink(d, [148, 163, 184]);
    const descLines = d.splitTextToSize(p.description, CW);
    descLines.slice(0, 5).forEach((ln, i) =>
      text(d, ln, ML, 130 + i * 5.5)
    );
  }

  // Metadata strip
  const stripY = PH - 60;
  fill(d, [15, 23, 42]);
  d.rect(0, stripY - 8, PW, 50, "F");
  stroke(d, C.accent); d.setLineWidth(0.4);
  d.line(0, stripY - 8, PW, stripY - 8);

  const items = [
    ["ERP / Platform",       p.erp || "Multi-platform"],
    ["Process Steps",        String((data.steps || []).length)],
    ["Automation Suggestions", String((data.suggestions || []).length)],
    ["Generated",            new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
  ];
  const colW = (PW - ML * 2) / items.length;
  items.forEach(([k, v], i) => {
    setFont(d, "normal", 7);
    ink(d, C.accent);
    text(d, String(k).toUpperCase(), ML + i * colW, stripY);
    setFont(d, "bold", 11);
    ink(d, [255, 255, 255]);
    text(d, v, ML + i * colW, stripY + 6);
  });

  setFont(d, "normal", 8);
  ink(d, [148, 163, 184]);
  text(d, "Confidential  •  Auto-generated by AgentForgeX", ML, PH - 8);
  text(d, "Draft V1.0", PW - MR, PH - 8, { align: "right" });
}

/* ─── §0 Executive Summary ─────────────────────────────────────────── */
function drawExecutiveSummary(d, data) {
  const p = data.process || {};
  const insights = data.key_insights || [];
  const targets  = data.top_automation_targets || [];

  let y = newSectionPage(d, "Executive Summary", 0, p.title || "");

  setFont(d, "normal", 10);
  ink(d, C.ink);
  const intro =
    `This report analyses **${p.title || 'the uploaded process'}** and ` +
    `proposes an agentic transformation blueprint. The pipeline identified ` +
    `**${(data.steps || []).length} process steps** and surfaced ` +
    `**${(data.suggestions || []).length} automation candidates** with ` +
    `${p.erp ? `the ${p.erp} platform` : 'a multi-platform stack'} as the integration target.`;
  y = wrap(d, intro.replace(/\*\*/g, ''), ML, y, CW, { size: 10.5, lineH: 5.5 });
  y += 4;

  // Key Insights box
  if (insights.length > 0) {
    setFont(d, "bold", 12);
    ink(d, C.accent);
    text(d, "Key Insights", ML, y); y += 6;
    insights.slice(0, 6).forEach((insight) => {
      const t = typeof insight === "string" ? insight : (insight.text || insight.insight || JSON.stringify(insight));
      y = pageBreakIfNeeded(d, y, 8, "Executive Summary", 0, p.title);
      fill(d, C.accent);
      d.circle(ML + 2, y - 1.5, 0.9, "F");
      y = wrap(d, t, ML + 7, y, CW - 7, { size: 9.5, lineH: 4.8 });
      y += 1.5;
    });
    y += 4;
  }

  // Top Automation Targets
  if (targets.length > 0) {
    y = pageBreakIfNeeded(d, y, 30, "Executive Summary", 0, p.title);
    setFont(d, "bold", 12);
    ink(d, C.accent);
    text(d, "Top Automation Targets", ML, y); y += 6;
    targets.slice(0, 5).forEach((t, i) => {
      const lbl = typeof t === "string" ? t : (t.title || t.name || `Target ${i + 1}`);
      const sub = typeof t === "object" ? (t.description || t.summary || "") : "";
      y = pageBreakIfNeeded(d, y, 14, "Executive Summary", 0, p.title);
      fill(d, C.surface);
      d.rect(ML, y, CW, 12, "F");
      fill(d, C.accent);
      d.rect(ML, y, 1.5, 12, "F");
      setFont(d, "bold", 10);
      ink(d, C.navy);
      text(d, `${i + 1}. ${lbl}`, ML + 4, y + 5);
      if (sub) {
        setFont(d, "normal", 8.5);
        ink(d, C.gray1);
        const lines = d.splitTextToSize(sub, CW - 8);
        text(d, lines[0], ML + 4, y + 9.5);
      }
      y += 14;
    });
  }
}

/* ─── §1 System & Module Inventory ─────────────────────────────────── */
function drawSystemInventory(d, data) {
  const p = data.process || {};
  const inventory = buildInventoryFromAnalysis(data);

  let y = newSectionPage(d, "System & Module Inventory", 1, p.title);
  y = renderBlocks(
    d, y,
    buildInventoryBlocks(inventory).filter((b, i) => !(i === 0 && b.type === "heading")),
    PALETTE_FOR_BLOCKS, BLOCK_OPTS,
  );
}

/**
 * Derive the inventory list from the analysis payload.  Mirrors the
 * server-side `build_system_module_inventory` defaults but works entirely
 * client-side so this section is always populated.
 */
function buildInventoryFromAnalysis(data) {
  const erpModules = data.erp_modules || [];
  const fromBackend = erpModules.map((m) => ({
    module_name:     m.name || m.module_name || "Module",
    source_system:   m.source_system || m.erp || data.process?.erp || "ERP",
    entities:        m.entities || m.tables || [],
    responsibilities: m.responsibilities || m.functions || [],
    description:     m.description || `${m.name || "Module"} module supports the process flow.`,
    context_origin:  "analysis_pipeline",
    data_flow_notes: m.data_flow || "",
  }));
  if (fromBackend.length > 0) return fromBackend;

  // Fallback seed when backend produced no modules
  const erp = data.process?.erp || "ERP";
  return [
    {
      module_name: `${erp} Master Data`,
      source_system: erp,
      entities: ["Master Records", "Reference Tables", "Configuration"],
      responsibilities: ["Maintains master data integrity", "Synchronises with downstream systems"],
      description: "Stores the canonical reference data consumed by the workflow agents.",
      context_origin: "client_default_seed",
    },
    {
      module_name: `${erp} Transaction Engine`,
      source_system: erp,
      entities: ["Transactions", "Postings", "Audit Records"],
      responsibilities: ["Records process transactions", "Maintains audit trail", "Triggers events"],
      description: "Persists every process transaction and exposes it to the agent layer.",
      context_origin: "client_default_seed",
    },
    {
      module_name: "Agent Orchestration Layer",
      source_system: "AgentForgeX",
      entities: ["Agent Definitions", "Workflow Graph", "Policy Bundles"],
      responsibilities: ["Coordinates specialist agents", "Applies guardrails", "Logs decisions"],
      description: "AgentForgeX's orchestration core that drives the agentic workflow.",
      context_origin: "client_default_seed",
    },
  ];
}

/* ─── §2 Constraint Diagnosis ─────────────────────────────────────── */
function drawConstraintDiagnosis(d, data) {
  const p = data.process || {};
  const steps = data.steps || [];

  let y = newSectionPage(d, "Constraint Diagnosis", 2, p.title);

  const lowAuto = steps.filter((s) => (s.automation_potential ?? 0) < 40);
  const manualCount = steps.filter((s) =>
    /human|manual|user/i.test((s.actor || "") + (s.title || ""))
  ).length;
  const handoffs = countHandoffs(steps);

  setFont(d, "normal", 10);
  ink(d, C.ink);
  const diag =
    `Throughput analysis of ${p.title || 'this process'} surfaced the ` +
    `following constraints:  ` +
    `**${lowAuto.length}** of ${steps.length} steps have automation potential below 40% ` +
    `(prime candidates for redesign),  **${manualCount}** steps are explicitly ` +
    `human-driven, and the flow contains **${handoffs}** inter-actor handoffs ` +
    `that introduce queueing delay.`;
  y = wrap(d, diag.replace(/\*\*/g, ''), ML, y, CW, { size: 10.5, lineH: 5.5 });
  y += 4;

  // Step-level diagnosis bullets
  setFont(d, "bold", 12);
  ink(d, C.accent);
  text(d, "Step-Level Bottlenecks", ML, y); y += 6;
  if (lowAuto.length === 0) {
    setFont(d, "italic", 9.5);
    ink(d, C.gray2);
    text(d, "No low-automation-potential steps detected — process is already AI-friendly.", ML, y);
    y += 6;
  } else {
    lowAuto.slice(0, 8).forEach((s) => {
      y = pageBreakIfNeeded(d, y, 8, "Constraint Diagnosis", 2, p.title);
      fill(d, C.amber);
      d.circle(ML + 2, y - 1.5, 0.9, "F");
      const txt = `Step ${s.step_number}: ${s.title} — automation potential ${s.automation_potential ?? 0}% (actor: ${s.actor || "—"})`;
      y = wrap(d, txt, ML + 7, y, CW - 7, { size: 9.5, lineH: 4.8 });
      y += 1.5;
    });
  }
}

function countHandoffs(steps) {
  let h = 0;
  for (let i = 1; i < steps.length; i++) {
    if ((steps[i].actor || "") !== (steps[i - 1].actor || "")) h++;
  }
  return h;
}

/* ─── §3 Future-State Process ─────────────────────────────────────── */
function drawFutureStateProcess(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Future-State Process", 3, p.title);

  setFont(d, "normal", 10);
  ink(d, C.ink);
  const intro =
    `The future-state process replaces routine handoffs with agent-mediated ` +
    `transitions while preserving human authority over exceptions, policy ` +
    `changes, and high-risk decisions.`;
  y = wrap(d, intro, ML, y, CW, { size: 10.5, lineH: 5.5 });
  y += 6;

  // Two-column table: stays human / becomes autonomous
  const colW = (CW - 4) / 2;
  const startY = y;

  fill(d, C.surface);
  d.rect(ML, y, colW, 8, "F");
  fill(d, C.amber); d.rect(ML, y, 1.5, 8, "F");
  setFont(d, "bold", 10);
  ink(d, C.amber);
  text(d, "What Stays Human", ML + 4, y + 5.5);

  fill(d, C.surface);
  d.rect(ML + colW + 4, y, colW, 8, "F");
  fill(d, C.green); d.rect(ML + colW + 4, y, 1.5, 8, "F");
  ink(d, C.green);
  text(d, "What Becomes Autonomous", ML + colW + 4 + 4, y + 5.5);
  y += 12;

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
  setFont(d, "normal", 9.5);
  for (let i = 0; i < maxRows; i++) {
    y = pageBreakIfNeeded(d, y, 6, "Future-State Process", 3, p.title);
    if (humanItems[i]) {
      ink(d, C.ink);
      text(d, "• " + humanItems[i], ML + 4, y);
    }
    if (autoItems[i]) {
      ink(d, C.ink);
      text(d, "• " + autoItems[i], ML + colW + 4 + 4, y);
    }
    y += 5.5;
  }
  void startY;
}

/* ─── §4 CSV Source Detection ─────────────────────────────────────── */
function drawCsvDetection(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "CSV Source Detection", 4, p.title);
  const detections = p.csv_source_detection || data.csv_source_detection || [];
  y = renderBlocks(
    d, y,
    buildCsvSourceBlocks(detections).filter((b, i) => !(i === 0 && b.type === "heading")),
    PALETTE_FOR_BLOCKS, BLOCK_OPTS,
  );
}

/* ─── §5 Document Data Lineage ────────────────────────────────────── */
function drawDataLineage(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Document Data Lineage", 5,
                        "Source · Target · ADF Fallback");
  const lineage = p.data_lineage || data.document_data_lineage || {
    fallback_applied: true,
    detection_method: "fallback",
    data_source: {
      name: "ADF (Azure Data Factory)",
      type: "Data Integration Service",
      evidence: "No explicit source identified — ADF default applied.",
    },
    data_target: {
      name: p.erp || "Target System",
      type: "Operational System",
      evidence: "Inferred from process metadata.",
    },
  };
  y = renderBlocks(
    d, y,
    buildDataLineageBlocks(lineage).filter((b, i) => !(i === 0 && b.type === "heading")),
    PALETTE_FOR_BLOCKS, BLOCK_OPTS,
  );

  // Visual flow: Source → Target
  if (y + 35 > PH - MBot) {
    d.addPage("a4", "portrait");
    drawPageHeader(d, "Document Data Lineage", p.title);
    y = MTop;
  }
  setFont(d, "bold", 10);
  ink(d, C.accent);
  text(d, "Lineage Diagram", ML, y); y += 6;

  const boxW = (CW - 30) / 2;
  // Source box
  fill(d, lineage.fallback_applied ? [255, 251, 235] : [236, 253, 245]);
  d.roundedRect(ML, y, boxW, 22, 2, 2, "F");
  stroke(d, lineage.fallback_applied ? C.amber : C.green);
  d.setLineWidth(0.6);
  d.roundedRect(ML, y, boxW, 22, 2, 2, "S");
  setFont(d, "bold", 8);
  ink(d, lineage.fallback_applied ? C.amber : C.green);
  text(d, "SOURCE", ML + 3, y + 5);
  setFont(d, "bold", 11);
  ink(d, C.navy);
  text(d, lineage.data_source?.name || "—", ML + 3, y + 11);
  setFont(d, "normal", 8.5);
  ink(d, C.gray1);
  text(d, lineage.data_source?.type || "", ML + 3, y + 17);

  // Arrow
  const cx1 = ML + boxW, cx2 = ML + boxW + 30, cy = y + 11;
  stroke(d, C.accent); d.setLineWidth(0.7);
  d.line(cx1 + 2, cy, cx2 - 4, cy);
  fill(d, C.accent);
  d.triangle(cx2 - 4, cy, cx2 - 8, cy - 2.5, cx2 - 8, cy + 2.5, "F");

  // Target box
  const tx = ML + boxW + 30;
  fill(d, [236, 253, 245]);
  d.roundedRect(tx, y, boxW, 22, 2, 2, "F");
  stroke(d, C.green); d.setLineWidth(0.6);
  d.roundedRect(tx, y, boxW, 22, 2, 2, "S");
  setFont(d, "bold", 8);
  ink(d, C.green);
  text(d, "TARGET", tx + 3, y + 5);
  setFont(d, "bold", 11);
  ink(d, C.navy);
  text(d, lineage.data_target?.name || "—", tx + 3, y + 11);
  setFont(d, "normal", 8.5);
  ink(d, C.gray1);
  text(d, lineage.data_target?.type || "", tx + 3, y + 17);
}

/* ─── §7 Architecture & BOM ───────────────────────────────────────── */
function drawArchitectureBom(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Architecture & Bill of Materials", 7, p.title);

  setFont(d, "normal", 10);
  ink(d, C.ink);
  const intro =
    "The agentic stack is layered: ingress → orchestration → specialist agents → " +
    "controlled outputs.  Pilot and production share the same shape; only the " +
    "data-plane targets differ.";
  y = wrap(d, intro, ML, y, CW, { size: 10.5, lineH: 5.5 });
  y += 6;

  // Components
  setFont(d, "bold", 11);
  ink(d, C.accent);
  text(d, "Architecture Components", ML, y); y += 6;

  const layers = [
    ["Presentation",   "React UI, dashboards, chatbot"],
    ["Ingress",        "API Gateway, schema validation, access control"],
    ["Orchestration",  "Plan-and-Execute orchestrator + policy bundles"],
    ["Agentic Core",   "Specialist agents (validation, fraud, payment, tracking)"],
    ["Knowledge Layer","ArangoDB graph + Vector store + Decision log"],
    ["Data Plane",     `${p.erp || "ERP"} adapters + ADF data integration`],
  ];
  layers.forEach(([k, v]) => {
    y = pageBreakIfNeeded(d, y, 10, "Architecture & Bill of Materials", 7, p.title);
    fill(d, C.surface);
    d.rect(ML, y, CW, 8, "F");
    fill(d, C.accent);
    d.rect(ML, y, 1.5, 8, "F");
    setFont(d, "bold", 9.5);
    ink(d, C.navy);
    text(d, k, ML + 4, y + 5);
    setFont(d, "normal", 9.5);
    ink(d, C.gray1);
    text(d, v, ML + 55, y + 5);
    y += 10;
  });
  y += 4;

  // BOM
  y = pageBreakIfNeeded(d, y, 30, "Architecture & Bill of Materials", 7, p.title);
  setFont(d, "bold", 11);
  ink(d, C.accent);
  text(d, "Bill of Materials", ML, y); y += 6;

  const bom = [
    "Orchestration framework (LangGraph) — production-grade",
    "Specialist agents (LangChain wrappers)",
    "Vector & metadata stores (ChromaDB + MySQL)",
    `${p.erp || "ERP"} connectors and adapters`,
    "Observability stack (OpenTelemetry + dashboards)",
    "Decision log and audit-trail store",
  ];
  bom.forEach((b) => {
    y = pageBreakIfNeeded(d, y, 7, "Architecture & Bill of Materials", 7, p.title);
    fill(d, C.accent);
    d.circle(ML + 2, y - 1.2, 0.8, "F");
    setFont(d, "normal", 9.5);
    ink(d, C.ink);
    text(d, b, ML + 7, y);
    y += 6;
  });
}

/* ─── §8 Operating Model & Governance ─────────────────────────────── */
function drawOperatingGovernance(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Operating Model & Governance", 8, p.title);

  setFont(d, "bold", 11);
  ink(d, C.accent);
  text(d, "RACI Highlights", ML, y); y += 6;

  const raci = [
    ["R", "Specialist Agents", "Routine cases inside the policy envelope"],
    ["A", "Process Manager",   "Policy, thresholds, and exception SLAs"],
    ["C", "Compliance / Audit","Escalations and decision-log reviews"],
    ["I", "Stakeholders",      "Status notifications + KPI dashboards"],
  ];
  raci.forEach(([r, who, what]) => {
    y = pageBreakIfNeeded(d, y, 10, "Operating Model & Governance", 8, p.title);
    fill(d, [16, 185, 129, 0.1]);
    d.rect(ML, y, 8, 8, "F");
    fill(d, C.accent);
    d.rect(ML, y, 8, 8, "F");
    setFont(d, "bold", 10);
    ink(d, [255, 255, 255]);
    text(d, r, ML + 4, y + 5.5, { align: "center" });
    setFont(d, "bold", 9.5);
    ink(d, C.navy);
    text(d, who, ML + 12, y + 3.5);
    setFont(d, "normal", 8.5);
    ink(d, C.gray1);
    text(d, what, ML + 12, y + 7);
    y += 11;
  });
  y += 4;

  setFont(d, "bold", 11);
  ink(d, C.accent);
  text(d, "Governance Controls", ML, y); y += 6;
  const gates = [
    ["Input validation",   "Schema + policy check on every inbound case."],
    ["Decision provenance","Every agent decision logged with prompts + tool calls."],
    ["Human override",     "All escalations carry an SLA and reassignment path."],
    ["Rollback",           "Single env-var flip reverts to manual processing."],
  ];
  gates.forEach(([k, v]) => {
    y = pageBreakIfNeeded(d, y, 10, "Operating Model & Governance", 8, p.title);
    fill(d, C.surface);
    d.rect(ML, y, CW, 9, "F");
    fill(d, C.accent);
    d.rect(ML, y, 1.5, 9, "F");
    setFont(d, "bold", 9.5);
    ink(d, C.navy);
    text(d, k, ML + 4, y + 5.5);
    setFont(d, "normal", 9);
    ink(d, C.gray1);
    text(d, v, ML + 55, y + 5.5);
    y += 11;
  });
}

/* ─── §9 Deployment Plan ─────────────────────────────────────────── */
function drawDeploymentPlan(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Deployment Plan", 9, p.title);
  const phases = [
    ["Discover",  "1–2",   "Confirm scope and constraints with stakeholders."],
    ["Diagnose",  "3–4",   "Quantify baseline KPIs and rank failure modes."],
    ["Design",    "5–6",   "Lock agent graph, policies, and guardrails."],
    ["Generate",  "7–8",   "Ship the scaffold (code + config) into staging."],
    ["Pilot",     "9–10",  "Run synthetic cases end-to-end; Steerco decision."],
    ["Rollout",   "11–14", "Expand to next slice with rollback toggle ready."],
  ];

  setFont(d, "bold", 8);
  ink(d, C.gray2);
  text(d, "PHASE",   ML, y + 4);
  text(d, "DAYS",    ML + 55, y + 4);
  text(d, "OUTCOME", ML + 75, y + 4);
  y += 7;
  strokeRect(d, ML, y - 2, CW, 0.4, C.accent);
  y += 2;

  phases.forEach(([ph, dys, out], i) => {
    y = pageBreakIfNeeded(d, y, 12, "Deployment Plan", 9, p.title);
    if (i % 2 === 0) { fill(d, C.surface); d.rect(ML, y, CW, 12, "F"); }
    fill(d, C.accent);
    d.rect(ML, y, 1.5, 12, "F");
    setFont(d, "bold", 10);
    ink(d, C.navy);
    text(d, ph, ML + 4, y + 7.5);
    setFont(d, "normal", 9.5);
    ink(d, C.ink);
    text(d, dys, ML + 55, y + 7.5);
    setFont(d, "normal", 9);
    ink(d, C.gray1);
    const lines = d.splitTextToSize(out, CW - 90);
    lines.slice(0, 2).forEach((ln, li) => text(d, ln, ML + 75, y + 6 + li * 4));
    y += 13;
  });
}

/* ─── §10 KPIs ────────────────────────────────────────────────────── */
function drawKpiTargets(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "KPI Targets & Success Criteria", 10, p.title);

  const kpis = [
    ["Cycle time (mean)",      "—", "-50%",  "Touchless flow eliminates handoffs"],
    ["Touchless rate",         "—", "≥70%",  "Routine cases flow without humans"],
    ["Exception backlog",      "—", "-40%",  "Earlier routing of the right cases"],
    ["Decision auditability",  "—", "100%",  "Every decision has a log entry"],
    ["Rollback time",          "—", "<5 min","Single config toggle to manual mode"],
  ];

  // Header
  fill(d, C.navy);
  d.rect(ML, y, CW, 9, "F");
  setFont(d, "bold", 8);
  ink(d, [255, 255, 255]);
  text(d, "METRIC",    ML + 3, y + 6);
  text(d, "BASELINE",  ML + 65, y + 6);
  text(d, "TARGET",    ML + 95, y + 6);
  text(d, "RATIONALE", ML + 120, y + 6);
  y += 11;

  kpis.forEach(([m, b, t, r], i) => {
    y = pageBreakIfNeeded(d, y, 10, "KPI Targets & Success Criteria", 10, p.title);
    if (i % 2 === 0) { fill(d, C.surface); d.rect(ML, y, CW, 9, "F"); }
    setFont(d, "bold", 9);
    ink(d, C.navy);
    text(d, m, ML + 3, y + 6);
    setFont(d, "normal", 9);
    ink(d, C.gray1);
    text(d, b, ML + 65, y + 6);
    setFont(d, "bold", 9.5);
    ink(d, C.green);
    text(d, t, ML + 95, y + 6);
    setFont(d, "normal", 8.5);
    ink(d, C.gray1);
    const lines = d.splitTextToSize(r, CW - 122);
    text(d, lines[0], ML + 120, y + 6);
    y += 10;
  });
}

/* ─── §11 Self-Improvement Loops ──────────────────────────────────── */
function drawSelfImprovement(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Self-Improvement Loops", 11, p.title);
  const loops = [
    ["Threshold tuning",    "Auto-approval rate vs exception cost"],
    ["Anomaly retraining",  "Fraud and outlier detection accuracy"],
    ["Prompt / policy diff","Agent reasoning consistency over time"],
    ["KPI feedback",        "Cycle time, touchless rate, backlog drift"],
  ];
  loops.forEach(([n, w], i) => {
    y = pageBreakIfNeeded(d, y, 22, "Self-Improvement Loops", 11, p.title);
    fill(d, C.surface);
    d.roundedRect(ML, y, CW, 18, 2, 2, "F");
    fill(d, C.accent);
    d.rect(ML, y, 1.5, 18, "F");
    setFont(d, "bold", 11);
    ink(d, C.navy);
    text(d, `Loop ${i + 1} — ${n}`, ML + 4, y + 7);
    setFont(d, "normal", 9.5);
    ink(d, C.gray1);
    text(d, `Optimises: ${w}`, ML + 4, y + 13);
    y += 21;
  });
}

/* ─── §12 Recommendations + Appendix ──────────────────────────────── */
function drawRecommendations(d, data) {
  const p = data.process || {};
  let y = newSectionPage(d, "Recommendations & Appendix", 12, p.title);

  const recs = [
    "Pilot on a single high-volume slice before scaling laterally.",
    "Treat thresholds and policies as configuration, not code.",
    "Keep the manual path warm so rollback is a config flip.",
    "Instrument the decision log first — visibility unlocks tuning.",
    "Track DSO / cycle-time deltas weekly during the pilot.",
  ];
  setFont(d, "bold", 12);
  ink(d, C.accent);
  text(d, "Recommendations", ML, y); y += 6;
  recs.forEach((r) => {
    y = pageBreakIfNeeded(d, y, 8, "Recommendations & Appendix", 12, p.title);
    fill(d, C.accent);
    d.circle(ML + 2, y - 1.2, 0.9, "F");
    y = wrap(d, r, ML + 7, y, CW - 7, { size: 9.5, lineH: 4.8 });
    y += 1.5;
  });
  y += 4;

  // Process steps appendix
  const steps = data.steps || [];
  if (steps.length > 0) {
    y = pageBreakIfNeeded(d, y, 20, "Recommendations & Appendix", 12, p.title);
    setFont(d, "bold", 12);
    ink(d, C.accent);
    text(d, "Appendix A — All Process Steps", ML, y); y += 6;

    // Compact table
    fill(d, C.navy);
    d.rect(ML, y, CW, 8, "F");
    setFont(d, "bold", 8);
    ink(d, [255, 255, 255]);
    text(d, "#",          ML + 2, y + 5.5);
    text(d, "STEP TITLE", ML + 12, y + 5.5);
    text(d, "ACTOR",      ML + 95, y + 5.5);
    text(d, "AUTO %",     ML + 135, y + 5.5);
    text(d, "SCORE",      PW - MR - 18, y + 5.5);
    y += 9;

    steps.forEach((s, i) => {
      y = pageBreakIfNeeded(d, y, 7, "Recommendations & Appendix", 12, p.title);
      if (i % 2 === 0) { fill(d, C.surface); d.rect(ML, y, CW, 7, "F"); }
      setFont(d, "normal", 8.5);
      ink(d, C.ink);
      text(d, String(s.step_number ?? i + 1), ML + 2, y + 5);
      const title = d.splitTextToSize(String(s.title || ""), 80)[0];
      text(d, title, ML + 12, y + 5);
      text(d, String(s.actor || "—").slice(0, 18), ML + 95, y + 5);
      text(d, `${s.automation_potential ?? 0}%`, ML + 135, y + 5);
      setFont(d, "bold", 8.5);
      ink(d, C.accent);
      text(d, String(s.automation_score ?? "—"), PW - MR - 18, y + 5);
      y += 7;
    });
  }
}

/* ─── PUBLIC: generateProcessPDF ──────────────────────────────────── */
export async function generateProcessPDF(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessPDF: invalid data payload");
  }
  const d = new jsPDF("portrait", "mm", "a4");

  // Cover
  drawCover(d, data);

  // §0 Executive Summary
  drawExecutiveSummary(d, data);

  // §1 System & Module Inventory
  drawSystemInventory(d, data);

  // §2 Constraint Diagnosis
  drawConstraintDiagnosis(d, data);

  // §3 Future-State Process
  drawFutureStateProcess(d, data);

  // §4 CSV Source Detection
  drawCsvDetection(d, data);

  // §5 Document Data Lineage
  drawDataLineage(d, data);

  // §7 Architecture & BOM
  drawArchitectureBom(d, data);

  // §8 Operating Model & Governance
  drawOperatingGovernance(d, data);

  // §9 Deployment Plan
  drawDeploymentPlan(d, data);

  // §10 KPI Targets
  drawKpiTargets(d, data);

  // §11 Self-Improvement Loops
  drawSelfImprovement(d, data);

  // §12 Recommendations + Appendix
  drawRecommendations(d, data);

  drawPageFooter(d);
  d.save(`${(data.process.title || "Process").replace(/\s+/g, "_")}_Blueprint.pdf`);
}
