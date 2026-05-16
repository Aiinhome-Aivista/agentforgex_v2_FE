/**
 * docxGenerator.js
 * Programmatic DOCX using docx library — pure text/tables, zero embedded images.
 * Target: < 500 KB
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  WidthType, TableBorders, convertInchesToTwip, PageBreak,
  Header, Footer, ImageRun,
} from "docx";

// ─── Colour helpers (OOXML hex) ───────────────────────────────────────────────
const HEX = {
  bg:       "FFFFFF",
  surface:  "F8FAFC",
  accent:   "10B981",
  accentDk: "059669",
  heading:  "0F172A",
  gray1:    "334155",
  gray2:    "64748B",
  gray3:    "94A3B8",
  border:   "E2E8F0",
  red:      "DC2626",
  amber:    "D97706",
  blue:     "2563EB",
};

// ─── Paragraph factory ────────────────────────────────────────────────────────

function p(runs, spacing = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing: { before: 60, after: 60, ...spacing },
  });
}

function run(text, opts = {}) {
  return new TextRun({ text: String(text ?? ""), ...opts });
}

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, color: HEX.accent, size: 36 })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, color: HEX.accent, size: 26 })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text, bold: true, color: HEX.gray1, size: 22 })],
  });
}

function bodyText(text, color = HEX.gray1, size = 20, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text: String(text ?? ""), color, size, bold })],
    spacing: { before: 40, after: 40 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text: String(text ?? ""), color: HEX.gray1, size: 19 })],
    bullet: { level },
    spacing: { before: 30, after: 30 },
  });
}

function labelValue(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: label + ": ", bold: true, color: HEX.gray2, size: 19 }),
      new TextRun({ text: String(value ?? "—"), color: HEX.gray1, size: 19 }),
    ],
    spacing: { before: 30, after: 30 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: HEX.border } },
    spacing: { before: 120, after: 120 },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Table factory ────────────────────────────────────────────────────────────

function sharedBorders() {
  return {
    top:    { style: BorderStyle.SINGLE, size: 4, color: HEX.border },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: HEX.border },
    left:   { style: BorderStyle.SINGLE, size: 4, color: HEX.border },
    right:  { style: BorderStyle.SINGLE, size: 4, color: HEX.border },
    insideH:{ style: BorderStyle.SINGLE, size: 2, color: HEX.border },
    insideV:{ style: BorderStyle.SINGLE, size: 2, color: HEX.border },
  };
}

function headerCell(text) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: HEX.accent, size: 18 })] })],
    shading: { type: ShadingType.SOLID, color: HEX.surface },
    borders: sharedBorders(),
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

function dataCell(text, shade = false) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), color: HEX.gray1, size: 18 })] })],
    shading: shade ? { type: ShadingType.SOLID, color: "F1F5F9" } : undefined,
    borders: sharedBorders(),
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  });
}

function buildTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: sharedBorders(),
    rows: [
      new TableRow({ children: headers.map(h => headerCell(h)), tableHeader: true }),
      ...rows.map((row, ri) =>
        new TableRow({ children: row.map(cell => dataCell(cell, ri % 2 === 0)) })
      ),
    ],
  });
}

// ─── Workflow section (text-based) ────────────────────────────────────────────

function workflowSection() {
  const stages = [
    ["01", "Input Collection",        "Raw process documents, tickets, API inputs ingested"],
    ["02", "Data Processing",         "OCR, parsing, chunking, entity extraction"],
    ["03", "AI Analysis",             "LLM reasoning, risk scoring, pattern detection"],
    ["04", "Multi-Agent Collaboration","Orchestrator delegates to specialist sub-agents"],
    ["05", "Validation",              "Guardrails, confidence scoring, self-refinement"],
    ["06", "Design Generation",       "Report Generator produces structured technical design"],
    ["07", "Final Output",            "Word report + chatbot enabled for ongoing queries"],
  ];

  return [
    heading2("Agentic Process Workflow"),
    bodyText("Operating Model: Hierarchical Orchestrator  |  Reasoning: Plan-and-Execute + ReAct", HEX.gray3, 17),
    new Paragraph({ spacing: { before: 80 } }),
    buildTable(
      ["Stage", "Phase", "Description"],
      stages
    ),
    new Paragraph({ spacing: { after: 160 } }),
  ];
}

// ─── Cover section ────────────────────────────────────────────────────────────

function coverSection(data, title) {
  const cp = data.cover_page || data.document_metadata || {};
  return [
    new Paragraph({
      children: [new TextRun({ text: "AgentForgeX", bold: true, color: HEX.accent, size: 32 })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (cp.document_type || "TECHNICAL DESIGN DOCUMENT").toUpperCase(), color: HEX.accent, size: 20, bold: true })],
      spacing: { before: 480, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title || cp.title || "Agentic AI Technical Design", bold: true, color: HEX.heading, size: 52 })],
      spacing: { before: 80, after: 160 },
    }),
    cp.subtitle ? new Paragraph({
      children: [new TextRun({ text: cp.subtitle, color: HEX.gray2, size: 28 })],
      spacing: { before: 0, after: 320 },
    }) : new Paragraph({ spacing: { after: 0 } }),
    divider(),
    buildTable(
      ["Date", "Version", "Organization"],
      [[cp.date || "2026", cp.version || "Draft V1.0", cp.organization || "PwC"]]
    ),
    pageBreak(),
  ];
}

// ─── TOC section ──────────────────────────────────────────────────────────────

function tocSection(data) {
  const toc = data.table_of_contents || data.sections || [];
  return [
    heading1("Table of Contents"),
    divider(),
    buildTable(
      ["#", "Section", "Page"],
      toc.map((s) => [
        String(s.section_number || s.section_no || ""),
        s.title || "",
        String(s.page || ""),
      ])
    ),
    pageBreak(),
  ];
}

// ─── Generic section renderer ─────────────────────────────────────────────────

function renderContent(val, depth = 0) {
  if (val === null || val === undefined || val === "") return [];
  const items = [];

  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    items.push(bodyText(String(val)));
    return items;
  }

  if (Array.isArray(val)) {
    val.forEach((item) => {
      if (typeof item === "string" || typeof item === "number") {
        items.push(bullet(String(item), depth));
      } else if (typeof item === "object") {
        const titleKey = ["name", "title", "type", "rail_type", "memory_type", "workflow_name", "metric", "tool_name", "component_name"].find(k => item[k]);
        if (titleKey) items.push(heading3(String(item[titleKey])));
        Object.entries(item).forEach(([k, v]) => {
          if (k === titleKey || ["id", "agent_id", "layer_id", "section_number", "section_no"].includes(k)) return;
          if (typeof v === "string" || typeof v === "number") {
            items.push(labelValue(k.replace(/_/g, " "), v));
          } else {
            items.push(bodyText(k.replace(/_/g, " "), HEX.gray3, 17, true));
            items.push(...renderContent(v, depth + 1));
          }
        });
        items.push(divider());
      }
    });
    return items;
  }

  if (typeof val === "object") {
    Object.entries(val).forEach(([k, v]) => {
      items.push(bodyText(k.replace(/_/g, " "), HEX.gray2, 18, true));
      items.push(...renderContent(v, depth + 1));
    });
  }

  return items;
}

function renderSection(section, secIndex) {
  const num = String(section.section_number || section.section_no || secIndex + 1).padStart(2, "0");
  const items = [heading1(`${num}  ${section.title || "Section"}`)];

  // Agents table
  if (section.architecture_layers) {
    section.architecture_layers.forEach((layer) => {
      items.push(heading2(`Layer ${layer.layer_id}: ${layer.name}`));
      if (layer.agents) {
        items.push(buildTable(
          ["Agent", "Role", "Framework", "Model Tier"],
          layer.agents.map(a => [
            `${a.agent_id}. ${a.name}`,
            a.role || "",
            a.reasoning_framework || "",
            a.model_tier || "",
          ])
        ));
      }
      if (layer.components) {
        items.push(heading3("Components"));
        items.push(buildTable(
          ["Component", "Responsibilities"],
          layer.components.map(c => [
            c.component_name || c.name || "",
            Array.isArray(c.responsibilities) ? c.responsibilities.slice(0, 2).join("; ") : "",
          ])
        ));
      }
      if (layer.rag_pipeline) {
        items.push(heading3("RAG Pipeline"));
        items.push(buildTable(
          ["Stage", "Name", "Components"],
          layer.rag_pipeline.map(s => [
            String(s.stage),
            s.name,
            (s.components || []).slice(0, 2).join("; "),
          ])
        ));
      }
    });
    items.push(pageBreak());
    return items;
  }

  if (section.subsections) {
    section.subsections.forEach(sub => {
      items.push(heading2(`${sub.section_number || ""} ${sub.title}`));
      if (sub.principles) {
        items.push(buildTable(
          ["#", "Principle", "Application"],
          sub.principles.map(p => [String(p.id || ""), p.name || "", p.application || ""])
        ));
      }
      if (sub.categories) {
        sub.categories.forEach(cat => {
          items.push(heading3(cat.type || ""));
          items.push(bodyText(cat.description || "", HEX.gray2));
        });
      }
    });
    items.push(pageBreak());
    return items;
  }

  if (section.frameworks) {
    const fw = section.frameworks;
    if (fw.orchestration?.length) {
      items.push(heading2("Orchestration"));
      items.push(buildTable(["Framework", "Role", "Features"], fw.orchestration.map(f => [f.name, f.role || "", (f.features || []).slice(0, 2).join("; ")])));
    }
    if (fw.rag_frameworks?.length) {
      items.push(heading2("RAG Frameworks"));
      items.push(buildTable(["Framework", "Role"], fw.rag_frameworks.map(f => [f.name, f.role || ""])));
    }
    if (fw.guardrails?.length) {
      items.push(heading2("Guardrails"));
      items.push(buildTable(["Framework", "Purpose"], fw.guardrails.map(f => [f.name, f.purpose || ""])));
    }
    if (fw.evaluation_tools?.length) {
      items.push(heading2("Evaluation Tools"));
      fw.evaluation_tools.forEach(e => items.push(bullet(e.name)));
    }
    if (fw.protocols?.length) {
      items.push(heading2("Protocols"));
      items.push(buildTable(["Protocol", "Purpose"], fw.protocols.map(f => [f.name, f.purpose || ""])));
    }
    items.push(pageBreak());
    return items;
  }

  if (section.tools) {
    items.push(buildTable(
      ["Tool", "Purpose", "Invoked By"],
      section.tools.map(t => [t.tool_name || t.name || "", t.purpose || "", t.invoked_by || ""])
    ));
    items.push(pageBreak());
    return items;
  }

  if (section.guardrails) {
    items.push(buildTable(
      ["Rail Type", "Functions"],
      section.guardrails.map(r => [r.rail_type || "", (r.functions || []).join("; ")])
    ));
    if (section.observability) {
      items.push(heading2("Observability"));
      Object.entries(section.observability).forEach(([k, v]) => items.push(labelValue(k.replace(/_/g, " "), v)));
    }
    items.push(pageBreak());
    return items;
  }

  if (section.metrics) {
    items.push(buildTable(
      ["Metric", "Target"],
      section.metrics.map(m => [m.metric || "", m.target || ""])
    ));
    items.push(pageBreak());
    return items;
  }

  if (section.memory_architecture) {
    items.push(buildTable(
      ["Memory Type", "Contents", "Storage"],
      section.memory_architecture.map(m => [
        m.memory_type || "",
        (m.contents || []).join("; "),
        (Array.isArray(m.storage) ? m.storage.join(", ") : m.storage) || "",
      ])
    ));
    if (section.critical_practices) {
      items.push(heading2("Critical Practices"));
      section.critical_practices.forEach(cp => items.push(bullet(cp)));
    }
    items.push(pageBreak());
    return items;
  }

  if (section.stack) {
    items.push(buildTable(
      ["Layer", "Technologies"],
      Object.entries(section.stack).map(([k, v]) => [
        k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        Array.isArray(v) ? v.join(", ") : String(v),
      ])
    ));
    items.push(pageBreak());
    return items;
  }

  if (section.content) {
    items.push(...renderContent(section.content));
    items.push(pageBreak());
    return items;
  }

  if (section.workflows) {
    items.push(buildTable(
      ["#", "Workflow"],
      section.workflows.map((w, i) => [String(i + 1), w.workflow_name || ""])
    ));
    items.push(pageBreak());
    return items;
  }

  if (section.report_structure) {
    section.report_structure.forEach((item, i) => items.push(bullet(`${String(i + 1).padStart(2, "0")}. ${item}`)));
    items.push(pageBreak());
    return items;
  }

  items.push(pageBreak());
  return items;
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function generateDOCX(data, title = "Technical_Design") {
  const footer = data.footer || {};
  const allChildren = [
    ...coverSection(data, title),
    ...tocSection(data),
    ...workflowSection(),
    pageBreak(),
    ...(data.sections || []).flatMap((s, i) => renderSection(s, i)),
    // Footer notice
    divider(),
    new Paragraph({
      children: [new TextRun({ text: footer.legal_notice || "© 2026 AgentForgeX. All rights reserved.", color: HEX.gray3, size: 16 })],
      alignment: AlignmentType.CENTER,
    }),
  ];

  const doc = new Document({
    creator: "AgentForgeX",
    title,
    description: "AI-Generated Technical Design Document",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", color: HEX.gray1 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "AgentForgeX  |  Confidential", color: HEX.gray3, size: 16 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}_Report.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
