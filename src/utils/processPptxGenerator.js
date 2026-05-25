/**
 * processPptxGenerator.js — REWRITTEN (blueprint-style)
 *
 * Follows the same §0–§12 structure as the PDF/DOCX generators, rendered as
 * a PowerPoint deck via pptxgenjs.  Addon sections (System & Module
 * Inventory, CSV Detection, Data Lineage) reuse the shared block renderer.
 */

import pptxgen from "pptxgenjs";
import {
  buildInventoryBlocks,
  buildCsvSourceBlocks,
  buildDataLineageBlocks,
} from "./exportSectionsAddon";
import { renderBlocksAsPptxSlides } from "./pptxBlockRenderer";

const T = {
  paper:   "FFFFFF",
  ink:     "0F172A",
  inkSoft: "475569",
  rule:    "E2E8F0",
  surface: "F8FAFC",
  brand:   "10B981",
  brandDk: "059669",
  navy:    "1E293B",
  amber:   "B45309",
  green:   "16A34A",
};

const SLIDE_W = 10;
const SLIDE_H = 7.5;
const MX = 0.5;
const TOP = 0.4;

function startSection(pptx, sectionNumber, title, subtitle) {
  const slide = pptx.addSlide({ masterName: "MASTER" });
  // Big section number block
  slide.addShape("rect", {
    x: MX, y: TOP, w: 0.6, h: 0.6, fill: { color: T.brand }, line: { color: T.brand },
  });
  slide.addText(`§${sectionNumber}`, {
    x: MX, y: TOP, w: 0.6, h: 0.6,
    fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: "Calibri",
  });
  slide.addText(title, {
    x: MX + 0.75, y: TOP + 0.02, w: SLIDE_W - MX * 2 - 0.75, h: 0.55,
    fontSize: 22, bold: true, color: T.ink, fontFace: "Calibri", valign: "middle",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MX + 0.75, y: TOP + 0.55, w: SLIDE_W - MX * 2 - 0.75, h: 0.35,
      fontSize: 11, italic: true, color: T.inkSoft, fontFace: "Calibri",
    });
  }
  slide.addShape("line", {
    x: MX, y: TOP + 0.95, w: SLIDE_W - MX * 2, h: 0,
    line: { color: T.brand, width: 1 },
  });
  return slide;
}

function applyFooter(pptx) {
  const total = pptx.slides ? pptx.slides.length : 0;
  pptx.slides?.forEach((slide, i) => {
    slide.addText(`AgentForgeX  |  Process Blueprint`, {
      x: 0.3, y: 7.2, w: 6, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri",
    });
    slide.addText(`Page ${i + 1} of ${total}`, {
      x: 7.5, y: 7.2, w: 2.2, h: 0.25,
      fontSize: 8, color: T.inkSoft, fontFace: "Calibri", align: "right",
    });
    slide.addShape("line", { x: 0.3, y: 7.15, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
  });
}

/* ─── Cover ─────────────────────────────────────────────────────────── */
function addCoverSlide(pptx, data) {
  const pr = data.process || {};
  const slide = pptx.addSlide({ masterName: "MASTER" });
  slide.background = { color: T.navy };

  slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.08, fill: { color: T.brand } });
  slide.addText("AGENTFORGEX", {
    x: 0.5, y: 0.6, w: 6, h: 0.4,
    fontSize: 12, bold: true, color: T.brand, fontFace: "Calibri",
  });
  slide.addText("Process Agentification Platform", {
    x: 0.5, y: 1.0, w: 6, h: 0.3,
    fontSize: 10, color: "94A3B8", fontFace: "Calibri",
  });
  slide.addShape("line", {
    x: 0.5, y: 2.2, w: 1.4, h: 0,
    line: { color: T.brand, width: 2 },
  });
  slide.addText(pr.title || "Process Analysis Report", {
    x: 0.5, y: 2.4, w: SLIDE_W - 1, h: 1.4,
    fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  slide.addText("Agentic Transformation Blueprint", {
    x: 0.5, y: 4.0, w: SLIDE_W - 1, h: 0.5,
    fontSize: 18, color: "CBD5E1", fontFace: "Calibri",
  });
  if (pr.description) {
    slide.addText(pr.description, {
      x: 0.5, y: 4.6, w: SLIDE_W - 1, h: 1.5,
      fontSize: 11, italic: true, color: "94A3B8", fontFace: "Calibri", valign: "top",
    });
  }
  // Metadata strip at bottom
  const metrics = [
    ["ERP / Platform", pr.erp || "Multi-platform"],
    ["Process Steps", String((data.steps || []).length)],
    ["Suggestions", String((data.suggestions || []).length)],
    ["Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })],
  ];
  metrics.forEach(([k, v], i) => {
    slide.addText(k.toUpperCase(), {
      x: 0.5 + i * 2.3, y: 6.4, w: 2.2, h: 0.25,
      fontSize: 8, bold: true, color: T.brand, fontFace: "Calibri",
    });
    slide.addText(v, {
      x: 0.5 + i * 2.3, y: 6.65, w: 2.2, h: 0.3,
      fontSize: 14, bold: true, color: "FFFFFF", fontFace: "Calibri",
    });
  });
}

/* ─── §0 Executive Summary ────────────────────────────────────────── */
function addExecutiveSummary(pptx, data) {
  const pr = data.process || {};
  const slide = startSection(pptx, 0, "Executive Summary", pr.title);
  const insights = data.key_insights || [];
  const targets = data.top_automation_targets || [];

  slide.addText(
    `This deck analyses ${pr.title || 'the uploaded process'} and proposes an ` +
    `agentic transformation blueprint. The pipeline identified ${(data.steps || []).length} ` +
    `process steps and surfaced ${(data.suggestions || []).length} automation candidates ` +
    `targeting ${pr.erp ? `the ${pr.erp} platform` : 'a multi-platform stack'}.`,
    {
      x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 1.0,
      fontSize: 12, color: T.ink, fontFace: "Calibri", valign: "top",
    },
  );

  if (insights.length > 0) {
    slide.addText("Key Insights", {
      x: MX, y: 2.8, w: SLIDE_W - MX * 2, h: 0.4,
      fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
    });
    const items = insights.slice(0, 5).map((i) => ({
      text: typeof i === "string" ? i : (i.text || i.insight || JSON.stringify(i)),
      options: { bullet: true },
    }));
    slide.addText(items, {
      x: MX + 0.1, y: 3.2, w: SLIDE_W - MX * 2 - 0.1, h: 2.2,
      fontSize: 11, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 4,
    });
  }

  if (targets.length > 0) {
    slide.addText("Top Automation Targets", {
      x: MX, y: 5.5, w: SLIDE_W - MX * 2, h: 0.4,
      fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
    });
    const tItems = targets.slice(0, 3).map((t, i) => {
      const lbl = typeof t === "string" ? t : (t.title || t.name || `Target ${i + 1}`);
      return { text: `${i + 1}. ${lbl}`, options: { bullet: true } };
    });
    slide.addText(tItems, {
      x: MX + 0.1, y: 5.9, w: SLIDE_W - MX * 2 - 0.1, h: 1.0,
      fontSize: 11, color: T.ink, fontFace: "Calibri",
    });
  }
}

/* ─── §1 System & Module Inventory ────────────────────────────────── */
function addSystemInventory(pptx, data) {
  startSection(pptx, 1, "System & Module Inventory", data.process?.title);
  const inventory = buildInventoryFromAnalysis(data);
  const blocks = buildInventoryBlocks(inventory).filter((b, i) => !(i === 0 && b.type === "heading"));
  renderBlocksAsPptxSlides(pptx, [
    { type: "heading", level: 1, text: "System & Module Inventory" },
    ...blocks,
  ]);
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
  }));
  if (fromBackend.length > 0) return fromBackend;
  const erp = data.process?.erp || "ERP";
  return [
    { module_name: `${erp} Master Data`, source_system: erp,
      entities: ["Master Records", "Reference Tables"],
      responsibilities: ["Maintains master data integrity"],
      description: "Canonical reference data consumed by the workflow agents.",
      context_origin: "client_default_seed" },
    { module_name: `${erp} Transaction Engine`, source_system: erp,
      entities: ["Transactions", "Postings", "Audit Records"],
      responsibilities: ["Records process transactions"],
      description: "Persists every process transaction and exposes it to the agent layer.",
      context_origin: "client_default_seed" },
    { module_name: "Agent Orchestration Layer", source_system: "AgentForgeX",
      entities: ["Agent Definitions", "Workflow Graph", "Policy Bundles"],
      responsibilities: ["Coordinates specialist agents"],
      description: "AgentForgeX's orchestration core that drives the workflow.",
      context_origin: "client_default_seed" },
  ];
}

/* ─── §2 Constraint Diagnosis ─────────────────────────────────────── */
function addConstraintDiagnosis(pptx, data) {
  const slide = startSection(pptx, 2, "Constraint Diagnosis", data.process?.title);
  const steps = data.steps || [];
  const lowAuto = steps.filter((s) => (s.automation_potential ?? 0) < 40);
  const manualCount = steps.filter((s) => /human|manual|user/i.test((s.actor || "") + (s.title || ""))).length;
  let handoffs = 0;
  for (let i = 1; i < steps.length; i++)
    if ((steps[i].actor || "") !== (steps[i - 1].actor || "")) handoffs++;

  slide.addText(
    `Throughput analysis surfaced ${lowAuto.length} low-automation-potential steps, ` +
    `${manualCount} explicitly human-driven steps, and ${handoffs} inter-actor handoffs.`,
    {
      x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 0.8,
      fontSize: 12, color: T.ink, fontFace: "Calibri", valign: "top",
    },
  );

  slide.addText("Step-Level Bottlenecks", {
    x: MX, y: 2.6, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  const items = lowAuto.length === 0
    ? [{ text: "No low-automation-potential steps detected.", options: { italic: true, color: T.inkSoft } }]
    : lowAuto.slice(0, 8).map((s) => ({
        text: `Step ${s.step_number}: ${s.title} — auto potential ${s.automation_potential ?? 0}% (actor: ${s.actor || "—"})`,
        options: { bullet: true },
      }));
  slide.addText(items, {
    x: MX + 0.1, y: 3.0, w: SLIDE_W - MX * 2 - 0.1, h: 3.5,
    fontSize: 10.5, color: T.ink, fontFace: "Calibri",
  });
}

/* ─── §3 Future-State Process ─────────────────────────────────────── */
function addFutureState(pptx, data) {
  const slide = startSection(pptx, 3, "Future-State Process", data.process?.title);
  slide.addText(
    "The future-state process replaces routine handoffs with agent-mediated transitions " +
    "while preserving human authority over exceptions and policy.",
    { x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 0.6,
      fontSize: 11, color: T.ink, fontFace: "Calibri", valign: "top" },
  );
  // Two-column comparison
  const colW = (SLIDE_W - MX * 2 - 0.3) / 2;
  const startY = 2.4;

  slide.addText("WHAT STAYS HUMAN", {
    x: MX, y: startY, w: colW, h: 0.4,
    fontSize: 12, bold: true, color: T.amber, fontFace: "Calibri",
  });
  slide.addShape("line", {
    x: MX, y: startY + 0.45, w: colW, h: 0, line: { color: T.amber, width: 2 },
  });
  slide.addText([
    { text: "Policy & threshold ownership", options: { bullet: true } },
    { text: "Master-data approvals",        options: { bullet: true } },
    { text: "Exception-case judgement",     options: { bullet: true } },
    { text: "Regulatory sign-off",          options: { bullet: true } },
  ], {
    x: MX + 0.1, y: startY + 0.55, w: colW - 0.1, h: 3.5,
    fontSize: 11, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 6,
  });

  slide.addText("WHAT BECOMES AUTONOMOUS", {
    x: MX + colW + 0.3, y: startY, w: colW, h: 0.4,
    fontSize: 12, bold: true, color: T.green, fontFace: "Calibri",
  });
  slide.addShape("line", {
    x: MX + colW + 0.3, y: startY + 0.45, w: colW, h: 0, line: { color: T.green, width: 2 },
  });
  slide.addText([
    { text: "Validation & data enrichment", options: { bullet: true } },
    { text: "Routine 3-way matching",       options: { bullet: true } },
    { text: "Status notifications",          options: { bullet: true } },
    { text: "Audit-log generation",          options: { bullet: true } },
    { text: "KPI computation & tracking",    options: { bullet: true } },
  ], {
    x: MX + colW + 0.4, y: startY + 0.55, w: colW - 0.1, h: 3.5,
    fontSize: 11, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 6,
  });
}

/* ─── §4 CSV Source Detection ─────────────────────────────────────── */
function addCsvDetection(pptx, data) {
  startSection(pptx, 4, "CSV Source Detection", data.process?.title);
  const detections = data.process?.csv_source_detection || data.csv_source_detection || [];
  const blocks = buildCsvSourceBlocks(detections).filter((b, i) => !(i === 0 && b.type === "heading"));
  renderBlocksAsPptxSlides(pptx, [
    { type: "heading", level: 1, text: "CSV Source Detection" },
    ...blocks,
  ]);
}

/* ─── §5 Data Lineage ─────────────────────────────────────────────── */
function addDataLineage(pptx, data) {
  startSection(pptx, 5, "Document Data Lineage", "Source · Target · ADF Fallback");
  const pr = data.process || {};
  const lineage = pr.data_lineage || data.document_data_lineage || {
    fallback_applied: true, detection_method: "fallback",
    data_source: { name: "ADF (Azure Data Factory)", type: "Data Integration Service",
                   evidence: "No explicit source — ADF default applied." },
    data_target: { name: pr.erp || "Target System", type: "Operational System",
                   evidence: "Inferred from process metadata." },
  };
  const blocks = buildDataLineageBlocks(lineage).filter((b, i) => !(i === 0 && b.type === "heading"));
  renderBlocksAsPptxSlides(pptx, [
    { type: "heading", level: 1, text: "Document Data Lineage" },
    ...blocks,
  ]);

  // Visual flow on a separate slide
  const slide = pptx.addSlide({ masterName: "MASTER" });
  slide.addText("Lineage Diagram", {
    x: MX, y: TOP, w: SLIDE_W - MX * 2, h: 0.5,
    fontSize: 18, bold: true, color: T.ink, fontFace: "Calibri",
  });
  slide.addShape("line", { x: MX, y: TOP + 0.55, w: SLIDE_W - MX * 2, h: 0, line: { color: T.brand, width: 1 } });

  const cy = 3.5, boxW = 3.5, boxH = 1.8;
  const srcFill = lineage.fallback_applied ? "FFFBEB" : "ECFDF5";
  const srcInk  = lineage.fallback_applied ? T.amber : T.green;

  slide.addShape("roundRect", {
    x: MX, y: cy, w: boxW, h: boxH,
    fill: { color: srcFill }, line: { color: srcInk, width: 2 }, rectRadius: 0.1,
  });
  slide.addText("SOURCE", { x: MX + 0.2, y: cy + 0.15, w: 2, h: 0.3, fontSize: 9, bold: true, color: srcInk, fontFace: "Calibri" });
  slide.addText(lineage.data_source?.name || "—", { x: MX + 0.2, y: cy + 0.5, w: boxW - 0.4, h: 0.5, fontSize: 16, bold: true, color: T.navy, fontFace: "Calibri" });
  slide.addText(lineage.data_source?.type || "", { x: MX + 0.2, y: cy + 1.0, w: boxW - 0.4, h: 0.5, fontSize: 11, color: T.inkSoft, fontFace: "Calibri" });

  // Arrow
  slide.addShape("rightArrow", {
    x: MX + boxW + 0.3, y: cy + 0.7, w: 1.6, h: 0.4,
    fill: { color: T.brand }, line: { color: T.brand },
  });

  const tx = MX + boxW + 2.1;
  slide.addShape("roundRect", {
    x: tx, y: cy, w: boxW, h: boxH,
    fill: { color: "ECFDF5" }, line: { color: T.green, width: 2 }, rectRadius: 0.1,
  });
  slide.addText("TARGET", { x: tx + 0.2, y: cy + 0.15, w: 2, h: 0.3, fontSize: 9, bold: true, color: T.green, fontFace: "Calibri" });
  slide.addText(lineage.data_target?.name || "—", { x: tx + 0.2, y: cy + 0.5, w: boxW - 0.4, h: 0.5, fontSize: 16, bold: true, color: T.navy, fontFace: "Calibri" });
  slide.addText(lineage.data_target?.type || "", { x: tx + 0.2, y: cy + 1.0, w: boxW - 0.4, h: 0.5, fontSize: 11, color: T.inkSoft, fontFace: "Calibri" });
}



/* ─── §7 Architecture + BOM ───────────────────────────────────────── */
function addArchitecture(pptx, data) {
  const slide = startSection(pptx, 7, "Architecture & Bill of Materials", data.process?.title);
  const pr = data.process || {};

  slide.addText("Architecture Components", {
    x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });

  const layers = [
    ["Presentation",    "React UI, dashboards, chatbot"],
    ["Ingress",         "API Gateway, schema validation, access control"],
    ["Orchestration",   "Plan-and-Execute orchestrator + policy bundles"],
    ["Agentic Core",    "Specialist agents (validation, fraud, payment)"],
    ["Knowledge Layer", "ArangoDB graph + Vector store + Decision log"],
    ["Data Plane",      `${pr.erp || "ERP"} adapters + ADF data integration`],
  ];
  slide.addTable(
    layers.map(([k, v]) => [
      { text: k, options: { bold: true, color: T.navy, fontSize: 10 } },
      { text: v, options: { color: T.ink, fontSize: 10 } },
    ]),
    {
      x: MX, y: 2.05, w: SLIDE_W - MX * 2,
      colW: [2.3, SLIDE_W - MX * 2 - 2.3],
      rowH: 0.35,
      border: { type: "solid", pt: 0.5, color: T.rule },
      fontFace: "Calibri",
    },
  );

  slide.addText("Bill of Materials", {
    x: MX, y: 4.6, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  slide.addText([
    { text: "Orchestration framework (LangGraph)", options: { bullet: true } },
    { text: "Specialist agents (LangChain wrappers)", options: { bullet: true } },
    { text: "Vector & metadata stores (ChromaDB + MySQL)", options: { bullet: true } },
    { text: `${pr.erp || "ERP"} connectors and adapters`, options: { bullet: true } },
    { text: "Observability stack (OpenTelemetry)", options: { bullet: true } },
    { text: "Decision log and audit-trail store", options: { bullet: true } },
  ], {
    x: MX + 0.1, y: 5.0, w: SLIDE_W - MX * 2 - 0.1, h: 1.8,
    fontSize: 10.5, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 3,
  });
}

/* ─── §8 Operating Model & Governance ────────────────────────────── */
function addOperatingGovernance(pptx, data) {
  const slide = startSection(pptx, 8, "Operating Model & Governance", data.process?.title);
  // RACI table
  slide.addText("RACI Highlights", {
    x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  slide.addTable([
    [
      { text: "",  options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9, align: "center" } },
      { text: "Who", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9 } },
      { text: "What", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9 } },
    ],
    [
      { text: "R", options: { bold: true, color: "FFFFFF", fill: { color: T.brand }, align: "center", fontSize: 11 } },
      { text: "Specialist Agents", options: { bold: true, fontSize: 10 } },
      { text: "Routine cases inside the policy envelope", options: { fontSize: 10 } },
    ],
    [
      { text: "A", options: { bold: true, color: "FFFFFF", fill: { color: T.brand }, align: "center", fontSize: 11 } },
      { text: "Process Manager", options: { bold: true, fontSize: 10 } },
      { text: "Policy, thresholds, and exception SLAs", options: { fontSize: 10 } },
    ],
    [
      { text: "C", options: { bold: true, color: "FFFFFF", fill: { color: T.brand }, align: "center", fontSize: 11 } },
      { text: "Compliance / Audit", options: { bold: true, fontSize: 10 } },
      { text: "Escalations and decision-log reviews", options: { fontSize: 10 } },
    ],
    [
      { text: "I", options: { bold: true, color: "FFFFFF", fill: { color: T.brand }, align: "center", fontSize: 11 } },
      { text: "Stakeholders", options: { bold: true, fontSize: 10 } },
      { text: "Status notifications + KPI dashboards", options: { fontSize: 10 } },
    ],
  ], {
    x: MX, y: 2.05, w: SLIDE_W - MX * 2,
    colW: [0.6, 2.5, SLIDE_W - MX * 2 - 3.1],
    rowH: 0.4,
    border: { type: "solid", pt: 0.5, color: T.rule },
    fontFace: "Calibri",
  });

  slide.addText("Governance Controls", {
    x: MX, y: 4.7, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  slide.addText([
    { text: "Input validation — schema + policy check on every inbound case.", options: { bullet: true } },
    { text: "Decision provenance — every agent decision logged.", options: { bullet: true } },
    { text: "Human override — all escalations carry an SLA and reassignment path.", options: { bullet: true } },
    { text: "Rollback — single env-var flip reverts to manual processing.", options: { bullet: true } },
  ], {
    x: MX + 0.1, y: 5.1, w: SLIDE_W - MX * 2 - 0.1, h: 1.7,
    fontSize: 10.5, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 4,
  });
}

/* ─── §9 Deployment Plan ─────────────────────────────────────────── */
function addDeploymentPlan(pptx, data) {
  const slide = startSection(pptx, 9, "Deployment Plan", data.process?.title);
  slide.addTable([
    [
      { text: "Phase", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
      { text: "Days",  options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
      { text: "Outcome", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
    ],
    ...[
      ["Discover",  "1–2",   "Confirm scope and constraints with stakeholders."],
      ["Diagnose",  "3–4",   "Quantify baseline KPIs and rank failure modes."],
      ["Design",    "5–6",   "Lock agent graph, policies, and guardrails."],
      ["Generate",  "7–8",   "Ship the scaffold (code + config) into staging."],
      ["Pilot",     "9–10",  "Run synthetic cases end-to-end; Steerco decision."],
      ["Rollout",   "11–14", "Expand to next slice with rollback toggle ready."],
    ].map(([ph, dys, out]) => [
      { text: ph, options: { bold: true, color: T.navy, fontSize: 11 } },
      { text: dys, options: { fontSize: 10 } },
      { text: out, options: { fontSize: 10 } },
    ]),
  ], {
    x: MX, y: 1.6, w: SLIDE_W - MX * 2,
    colW: [1.8, 1.0, SLIDE_W - MX * 2 - 2.8],
    rowH: 0.45,
    border: { type: "solid", pt: 0.5, color: T.rule },
    fontFace: "Calibri",
  });
}

/* ─── §10 KPI Targets ────────────────────────────────────────────── */
function addKpiTargets(pptx, data) {
  const slide = startSection(pptx, 10, "KPI Targets & Success Criteria", data.process?.title);
  slide.addTable([
    [
      { text: "Metric", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
      { text: "Baseline", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
      { text: "Target", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
      { text: "Rationale", options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 10 } },
    ],
    ...[
      ["Cycle time (mean)",     "—", "-50%",   "Touchless flow eliminates handoffs"],
      ["Touchless rate",        "—", "≥70%",   "Routine cases flow without humans"],
      ["Exception backlog",     "—", "-40%",   "Earlier routing of the right cases"],
      ["Decision auditability", "—", "100%",   "Every decision has a log entry"],
      ["Rollback time",         "—", "<5 min", "Single config toggle to manual mode"],
    ].map(([m, b, t, r]) => [
      { text: m, options: { bold: true, color: T.navy, fontSize: 10 } },
      { text: b, options: { fontSize: 10 } },
      { text: t, options: { bold: true, color: T.green, fontSize: 10 } },
      { text: r, options: { fontSize: 10 } },
    ]),
  ], {
    x: MX, y: 1.6, w: SLIDE_W - MX * 2,
    colW: [2.5, 1.2, 1.2, SLIDE_W - MX * 2 - 4.9],
    rowH: 0.45,
    border: { type: "solid", pt: 0.5, color: T.rule },
    fontFace: "Calibri",
  });
}

/* ─── §11 Self-Improvement Loops ─────────────────────────────────── */
function addSelfImprovement(pptx, data) {
  const slide = startSection(pptx, 11, "Self-Improvement Loops", data.process?.title);
  const loops = [
    ["Threshold tuning",    "Auto-approval rate vs exception cost"],
    ["Anomaly retraining",  "Fraud and outlier detection accuracy"],
    ["Prompt / policy diff","Agent reasoning consistency over time"],
    ["KPI feedback",        "Cycle time, touchless rate, backlog drift"],
  ];
  loops.forEach(([n, w], i) => {
    const y = 1.6 + i * 1.2;
    slide.addShape("roundRect", {
      x: MX, y, w: SLIDE_W - MX * 2, h: 1.0,
      fill: { color: T.surface }, line: { color: T.rule, width: 0.5 }, rectRadius: 0.08,
    });
    slide.addShape("rect", { x: MX, y, w: 0.08, h: 1.0, fill: { color: T.brand }, line: { color: T.brand } });
    slide.addText(`Loop ${i + 1} — ${n}`, {
      x: MX + 0.2, y: y + 0.12, w: SLIDE_W - MX * 2 - 0.3, h: 0.4,
      fontSize: 13, bold: true, color: T.navy, fontFace: "Calibri",
    });
    slide.addText(`Optimises: ${w}`, {
      x: MX + 0.2, y: y + 0.55, w: SLIDE_W - MX * 2 - 0.3, h: 0.4,
      fontSize: 11, color: T.inkSoft, fontFace: "Calibri",
    });
  });
}

/* ─── §12 Recommendations + Appendix ─────────────────────────────── */
function addRecommendations(pptx, data) {
  const slide = startSection(pptx, 12, "Recommendations & Appendix", data.process?.title);
  slide.addText("Recommendations", {
    x: MX, y: 1.6, w: SLIDE_W - MX * 2, h: 0.4,
    fontSize: 14, bold: true, color: T.brandDk, fontFace: "Calibri",
  });
  slide.addText([
    { text: "Pilot on a single high-volume slice before scaling laterally.", options: { bullet: true } },
    { text: "Treat thresholds and policies as configuration, not code.", options: { bullet: true } },
    { text: "Keep the manual path warm so rollback is a config flip.", options: { bullet: true } },
    { text: "Instrument the decision log first — visibility unlocks tuning.", options: { bullet: true } },
    { text: "Track DSO / cycle-time deltas weekly during the pilot.", options: { bullet: true } },
  ], {
    x: MX + 0.1, y: 2.05, w: SLIDE_W - MX * 2 - 0.1, h: 2.5,
    fontSize: 11, color: T.ink, fontFace: "Calibri", paraSpaceAfter: 6,
  });

  // Appendix — process steps summary
  const steps = data.steps || [];
  if (steps.length > 0) {
    const aSlide = pptx.addSlide({ masterName: "MASTER" });
    aSlide.addText("Appendix A — All Process Steps", {
      x: MX, y: TOP, w: SLIDE_W - MX * 2, h: 0.5,
      fontSize: 18, bold: true, color: T.ink, fontFace: "Calibri",
    });
    aSlide.addShape("line", { x: MX, y: TOP + 0.55, w: SLIDE_W - MX * 2, h: 0, line: { color: T.brand, width: 1 } });

    const headerRow = ["#", "Step Title", "Actor", "Auto %", "Score"].map((h) => ({
      text: h, options: { bold: true, color: "FFFFFF", fill: { color: T.navy }, fontSize: 9 },
    }));
    const rows = steps.map((s, i) => [
      { text: String(s.step_number ?? i + 1), options: { fontSize: 9 } },
      { text: String(s.title || ""), options: { bold: true, fontSize: 9 } },
      { text: String(s.actor || "—"), options: { fontSize: 9 } },
      { text: `${s.automation_potential ?? 0}%`, options: { fontSize: 9 } },
      { text: String(s.automation_score ?? "—"), options: { bold: true, color: T.brand, fontSize: 9 } },
    ]);

    aSlide.addTable([headerRow, ...rows], {
      x: MX, y: 1.1, w: SLIDE_W - MX * 2,
      colW: [0.5, 4.5, 2.0, 1.0, SLIDE_W - MX * 2 - 8.0],
      rowH: 0.3,
      border: { type: "solid", pt: 0.5, color: T.rule },
      fontFace: "Calibri",
    });
  }
  void slide;
}

/* ─── PUBLIC: generateProcessPPTX ─────────────────────────────────── */
export async function generateProcessPPTX(data) {
  if (!data || !data.process) {
    throw new Error("generateProcessPPTX: invalid data payload");
  }

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "STD_10X75", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "STD_10X75";
  pptx.author = "AgentForgeX";
  pptx.title  = (data.process.title || "Process Blueprint").replace(/[^\x00-\x7F]/g, " ");
  pptx.defineSlideMaster({ title: "MASTER", background: { color: T.paper }, objects: [] });

  addCoverSlide(pptx, data);
  addExecutiveSummary(pptx, data);
  addSystemInventory(pptx, data);
  addConstraintDiagnosis(pptx, data);
  addFutureState(pptx, data);
  addCsvDetection(pptx, data);
  addDataLineage(pptx, data);

  addArchitecture(pptx, data);
  addOperatingGovernance(pptx, data);
  addDeploymentPlan(pptx, data);
  addKpiTargets(pptx, data);
  addSelfImprovement(pptx, data);
  addRecommendations(pptx, data);

  applyFooter(pptx);

  await pptx.writeFile({
    fileName: `${(data.process.title || "Process").replace(/[^a-z0-9_-]+/gi, "_")}_Blueprint.pptx`,
  });
}
