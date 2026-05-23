/**
 * exportSectionsAddon.js
 *
 * Section renderers shared by pdfGenerator / docxGenerator / pptxGenerator
 * for the NEW dynamic sections introduced by the spec:
 *
 *   • System & Module Inventory
 *   • CSV Source Detection
 *   • Document Data Lineage (with ADF fallback)
 *   • Blueprint-style per-suggestion content
 *
 * The data is read from the technical-design payload returned by
 * GET /api/suggestions/<id>/technical-design — specifically:
 *
 *   payload.system_module_inventory
 *   payload.csv_source_detection
 *   payload.document_data_lineage
 *   payload.per_suggestion_blueprint
 *
 * The functions are framework-agnostic: each one returns a plain JS array
 * of "blocks" that each generator translates into its native primitives.
 *
 * Block shapes:
 *   { type: "heading",   text, level }              // level 1..3
 *   { type: "paragraph", text }
 *   { type: "bullets",   items: [string, ...] }
 *   { type: "kv",        rows: [[key, value], ...] }
 *   { type: "table",     headers: [..], rows: [[..], ..] }
 *   { type: "callout",   tone: "info"|"warn", text }
 */

/* ─── System & Module Inventory ───────────────────────────────────────── */
export function buildInventoryBlocks(inventory) {
  const blocks = [];
  blocks.push({ type: "heading", level: 1, text: "System & Module Inventory" });
  blocks.push({
    type: "paragraph",
    text:
      "The inventory below is generated dynamically from the uploaded " +
      "content, the analysis pipeline output, and an AI enrichment pass — " +
      "guaranteeing this section is always populated.",
  });

  if (!inventory || inventory.length === 0) {
    blocks.push({
      type: "callout",
      tone: "warn",
      text:
        "No modules could be inferred — the analysis pipeline produced no " +
        "signals AND the fallback synthesiser yielded nothing. Please re-run " +
        "the analysis with a richer document.",
    });
    return blocks;
  }

  inventory.forEach((m, i) => {
    blocks.push({
      type: "heading",
      level: 2,
      text: `${i + 1}. ${m.module_name || "Module"}`,
    });
    if (m.description) {
      blocks.push({ type: "paragraph", text: m.description });
    }
    blocks.push({
      type: "kv",
      rows: [
        ["Source System",  m.source_system || "—"],
        ["Entities",       (m.entities || []).join(", ") || "—"],
        ["Context Origin", m.context_origin || "—"],
        ...(m.data_flow_notes ? [["Data Flow", m.data_flow_notes]] : []),
      ],
    });
    if (m.responsibilities && m.responsibilities.length) {
      blocks.push({ type: "bullets", items: m.responsibilities });
    }
  });

  return blocks;
}

/* ─── CSV Source Detection ────────────────────────────────────────────── */
export function buildCsvSourceBlocks(csvDetections) {
  const blocks = [];
  blocks.push({ type: "heading", level: 1, text: "CSV Source Detection" });

  if (!csvDetections || csvDetections.length === 0) {
    blocks.push({
      type: "paragraph",
      text:
        "No CSV files were uploaded with this analysis, so no CSV source " +
        "detection results are shown here. When CSVs are uploaded, every " +
        "file is auto-classified using schema heuristics plus an AI " +
        "metadata-analysis pass.",
    });
    return blocks;
  }

  blocks.push({
    type: "paragraph",
    text:
      "Each uploaded CSV is automatically classified using deterministic " +
      "schema heuristics combined with an AI-based metadata pass. " +
      "The table below shows the probable source system for each file.",
  });

  blocks.push({
    type: "table",
    headers: ["File", "Source System", "Confidence", "Method", "Reasoning"],
    rows: csvDetections.map((r) => [
      r.file_name || "—",
      r.source_system || "—",
      (r.confidence || "—").toString().toUpperCase(),
      r.detection_method || "—",
      truncate(r.reasoning || "", 90),
    ]),
  });

  // Per-file schema preview
  csvDetections.forEach((r, i) => {
    if (!r.schema_preview || r.schema_preview.length === 0) return;
    blocks.push({
      type: "heading",
      level: 3,
      text: `Schema preview — ${r.file_name || `file ${i + 1}`}`,
    });
    blocks.push({
      type: "paragraph",
      text: r.schema_preview.join(",  "),
    });
  });

  return blocks;
}

/* ─── Document Data Lineage (ADF fallback) ────────────────────────────── */
export function buildDataLineageBlocks(lineage) {
  const blocks = [];
  blocks.push({ type: "heading", level: 1, text: "Document Data Lineage" });

  if (!lineage) {
    blocks.push({
      type: "paragraph",
      text:
        "No lineage information available — defaulting to ADF (Azure Data " +
        "Factory) per the platform's fallback policy.",
    });
    return blocks;
  }

  if (lineage.fallback_applied) {
    blocks.push({
      type: "callout",
      tone: "info",
      text:
        "ADF (Azure Data Factory) fallback applied. No explicit data source " +
        "was identified inside the uploaded document, so ADF is assumed as " +
        "the source system to keep automation routing uninterrupted.",
    });
  }

  const src = lineage.data_source || {};
  const tgt = lineage.data_target || {};

  blocks.push({
    type: "kv",
    rows: [
      ["Detection Method", lineage.detection_method || "—"],
      ["Fallback Applied", lineage.fallback_applied ? "Yes (ADF default)" : "No"],
      ["Data Source",      src.name || "—"],
      ["Source Type",      src.type || "—"],
      ["Source Evidence",  src.evidence || "—"],
      ["Data Target",      tgt.name || "—"],
      ["Target Type",      tgt.type || "—"],
      ["Target Evidence",  tgt.evidence || "—"],
    ],
  });

  return blocks;
}

/* ─── Per-Suggestion Blueprint (P2P-style content) ────────────────────── */
export function buildBlueprintBlocks(bp) {
  const blocks = [];
  if (!bp) return blocks;

  blocks.push({ type: "heading", level: 1, text: "Agentic Suggestion Blueprint" });

  if (bp.executive_summary) {
    blocks.push({ type: "heading", level: 2, text: "Executive Summary" });
    blocks.push({ type: "paragraph", text: bp.executive_summary });
  }

  if (bp.constraint_diagnosis) {
    blocks.push({ type: "heading", level: 2, text: "Constraint Diagnosis" });
    blocks.push({ type: "paragraph", text: bp.constraint_diagnosis });
  }

  if (bp.future_state_process) {
    blocks.push({ type: "heading", level: 2, text: "Future-State Process" });
    if (bp.future_state_process.narrative) {
      blocks.push({ type: "paragraph", text: bp.future_state_process.narrative });
    }
    if (bp.future_state_process.what_stays_human?.length) {
      blocks.push({ type: "heading", level: 3, text: "What stays human" });
      blocks.push({ type: "bullets", items: bp.future_state_process.what_stays_human });
    }
    if (bp.future_state_process.what_becomes_autonomous?.length) {
      blocks.push({ type: "heading", level: 3, text: "What becomes autonomous" });
      blocks.push({ type: "bullets", items: bp.future_state_process.what_becomes_autonomous });
    }
  }

  if (bp.automation_logic) {
    blocks.push({ type: "heading", level: 2, text: "Automation Logic" });
    blocks.push({
      type: "kv",
      rows: [
        ["Trigger",              bp.automation_logic.trigger || "—"],
        ["Exception Handling",   bp.automation_logic.exception_handling || "—"],
      ],
    });
    if (bp.automation_logic.decision_points?.length) {
      blocks.push({ type: "heading", level: 3, text: "Decision Points" });
      blocks.push({ type: "bullets", items: bp.automation_logic.decision_points });
    }
    if (bp.automation_logic.actions?.length) {
      blocks.push({ type: "heading", level: 3, text: "Actions" });
      blocks.push({ type: "bullets", items: bp.automation_logic.actions });
    }
  }

  if (bp.architecture_details) {
    blocks.push({ type: "heading", level: 2, text: "Architecture Details" });
    if (bp.architecture_details.summary) {
      blocks.push({ type: "paragraph", text: bp.architecture_details.summary });
    }
    if (bp.architecture_details.components_annotated?.length) {
      blocks.push({
        type: "table",
        headers: ["Component", "Responsibility"],
        rows: bp.architecture_details.components_annotated.map((c) => [
          c.name || "—",
          c.responsibility || "—",
        ]),
      });
    }
  }

  if (bp.operating_model) {
    blocks.push({ type: "heading", level: 2, text: "Operating Model" });
    if (bp.operating_model.decision_rights) {
      blocks.push({ type: "paragraph", text: bp.operating_model.decision_rights });
    }
    if (bp.operating_model.raci_highlights?.length) {
      blocks.push({ type: "bullets", items: bp.operating_model.raci_highlights });
    }
  }

  if (bp.bill_of_materials?.length) {
    blocks.push({ type: "heading", level: 2, text: "Bill of Materials" });
    blocks.push({ type: "bullets", items: bp.bill_of_materials });
  }

  if (bp.deployment_plan?.length) {
    blocks.push({ type: "heading", level: 2, text: "Deployment Plan" });
    blocks.push({
      type: "table",
      headers: ["Phase", "Days", "Outcome"],
      rows: bp.deployment_plan.map((p) => [
        p.phase || "—", p.days || "—", p.outcome || "—",
      ]),
    });
  }

  if (bp.governance_controls?.length) {
    blocks.push({ type: "heading", level: 2, text: "Governance Controls" });
    blocks.push({
      type: "table",
      headers: ["Control Gate", "Control"],
      rows: bp.governance_controls.map((g) => [
        g.gate || "—", g.control || "—",
      ]),
    });
  }

  if (bp.self_improvement_loops?.length) {
    blocks.push({ type: "heading", level: 2, text: "Self-Improvement Loops" });
    blocks.push({
      type: "table",
      headers: ["Loop", "What it optimises"],
      rows: bp.self_improvement_loops.map((l) => [
        l.loop_name || "—", l.what_it_optimises || "—",
      ]),
    });
  }

  if (bp.recommendations?.length) {
    blocks.push({ type: "heading", level: 2, text: "Recommendations" });
    blocks.push({ type: "bullets", items: bp.recommendations });
  }

  if (bp.kpi_targets?.length) {
    blocks.push({ type: "heading", level: 2, text: "KPI Targets" });
    blocks.push({
      type: "table",
      headers: ["Metric", "Baseline", "Target", "Rationale"],
      rows: bp.kpi_targets.map((k) => [
        k.metric || "—", k.baseline || "—", k.target || "—", k.rationale || "—",
      ]),
    });
  }

  return blocks;
}

/* ─── Convenience: merge everything for a single technical-design payload ── */
export function buildAddonBlocks(design) {
  if (!design) return [];
  // Accept both legacy and current key names for the per-suggestion blueprints.
  const blueprints =
    design.suggestion_blueprints ||
    design.per_suggestion_blueprint ||
    design.per_suggestion_blueprints ||
    [];
  return [
    ...buildInventoryBlocks(design.system_module_inventory),
    ...buildCsvSourceBlocks(design.csv_source_detection),
    ...buildDataLineageBlocks(design.document_data_lineage),
    ...buildBlueprintBlocks(blueprints),
  ];
}

/* ─── helpers ─────────────────────────────────────────────────────────── */
function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
