/**
 * processDocxGenerator.js — AgentForgeX Process Analysis Report
 * 
 * Native DOCX generation using the docx library.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, ShadingType, WidthType, PageBreak, Footer,
  PageOrientation
} from "docx";

const HEX = {
  paper:     "FFFFFF",
  ink:       "0F172A",
  inkSoft:   "475569",
  rule:      "E2E8F0",
  surface:   "F8FAFC",
  brand:     "10B981",
  brandDk:   "059669",
  navy:      "1E293B",
};

/* ─── Helpers ────────────────────────────────────────────────────────── */
function p(runs, opts = {}) {
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing: { before: 60, after: 60, ...(opts.spacing || {}) },
    alignment: opts.alignment,
  });
}
function run(text, opts = {}) { return new TextRun({ text: String(text ?? ""), ...opts }); }
function h1(text) { return p(run(text, { bold: true, color: HEX.ink, size: 32 }), { spacing: { before: 200, after: 120 } }); }
function h2(text) { return p(run(text, { bold: true, color: HEX.brandDk, size: 26 }), { spacing: { before: 200, after: 100 } }); }
function h3(text) { return p(run(text, { bold: true, color: HEX.ink, size: 22 }), { spacing: { before: 160, after: 60 } }); }
function body(text, opts = {}) { return p(run(text, { color: HEX.ink, size: 20, ...opts }), { spacing: { before: 40, after: 40 } }); }
function spacer(size = 200) { return new Paragraph({ children: [], spacing: { before: size, after: 0 } }); }

const borders = (color = HEX.rule, size = 2) => ({
  top:    { style: BorderStyle.SINGLE, size, color },
  bottom: { style: BorderStyle.SINGLE, size, color },
  left:   { style: BorderStyle.SINGLE, size, color },
  right:  { style: BorderStyle.SINGLE, size, color },
});

function headerCell(text) {
  return new TableCell({
    children: [p(run(text, { bold: true, color: HEX.paper, size: 18 }))],
    shading: { type: ShadingType.SOLID, color: HEX.navy },
    borders: borders(HEX.navy),
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  });
}

function dataCell(text, shade = null) {
  return new TableCell({
    children: [p(run(text, { color: HEX.ink, size: 18 }))],
    shading: shade ? { type: ShadingType.SOLID, color: shade } : undefined,
    borders: borders(HEX.rule),
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

/* ─── Sections ───────────────────────────────────────────────────────── */
function buildCover(process) {
  return [
    p([run("AgentForgeX", { bold: true, color: HEX.brand, size: 36 })], { spacing: { before: 0, after: 80 } }),
    p([run("PROCESS INTELLIGENCE REPORT", { color: HEX.brand, size: 16 })], { spacing: { before: 0, after: 400 } }),
    h1(process.title || "Process Analysis"),
    process.description ? body(process.description, { italics: true }) : spacer(0),
    spacer(400),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            dataCell("Automation Score", HEX.surface),
            new TableCell({
              children: [p(run(`${Math.round(process.automation_score || 0)}%`, { color: HEX.brand, bold: true, size: 20 }))],
              shading: { type: ShadingType.SOLID, color: HEX.surface },
              borders: borders(HEX.rule),
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
          ]
        }),
        new TableRow({
          children: [
            dataCell("ERP System", HEX.paper),
            dataCell(process.erp_system || "Enterprise", HEX.paper),
          ]
        }),
        new TableRow({
          children: [
            dataCell("Date", HEX.surface),
            dataCell(new Date().toLocaleDateString(), HEX.surface),
          ]
        }),
      ]
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

export async function generateProcessDOCX(data) {
  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = data;

  const children = [...buildCover(process)];

  // 1. Insights
  children.push(h2("Key Process Insights"));
  key_insights?.forEach((ins, i) => {
    children.push(p([
      run(`0${i + 1}. `, { bold: true, color: HEX.brand }),
      run(ins.text, { size: 20 })
    ]));
    children.push(p(run(`${ins.category?.toUpperCase()} · ${ins.impact?.toUpperCase()} IMPACT`, { size: 16, color: HEX.inkSoft })));
  });

  // 2. Targets Table
  children.push(h2("Top Automation Targets"));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["Rank", "Process Title", "Actor", "Potential"].map(h => headerCell(h))
      }),
      ...(top_automation_targets || []).map((t, i) => new TableRow({
        children: [
          dataCell(String(i + 1)),
          dataCell(t.title),
          dataCell(t.actor),
          dataCell(`${t.automation_potential}%`)
        ]
      }))
    ]
  }));

  // 3. Step Breakdown
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h2("Process Step Breakdown"));
  steps?.forEach((step) => {
    children.push(h3(step.title));
    children.push(p([
      run(`${step.actor?.toUpperCase()} · ${step.step_type?.toUpperCase()}`, { bold: true, color: HEX.brand, size: 16 }),
      run(` | ${step.automation_potential}% Potential`, { color: HEX.brandDk, size: 16 })
    ]));
    children.push(body(step.description));
    children.push(spacer(100));
  });

  // 4. ERP Context
  children.push(h2("System & Module Inventory"));
  erp_modules?.forEach((mod) => {
    children.push(h3(mod.module_name));
    children.push(body(mod.description));
    children.push(p([run("Entities: ", { bold: true }), run(mod.tables_identified?.join(", ") || "None")]));
    children.push(spacer(100));
  });

  // 5. Suggestions
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h2("Automation Opportunities"));
  suggestions?.forEach((s) => {
    children.push(h3(s.title));
    children.push(body(s.description));
    children.push(p([
      run("ROI: ", { bold: true }), run(s.roi_impact),
      run(" | Effort: ", { bold: true }), run(s.effort_level),
      run(" | Accuracy: ", { bold: true }), run(`${s.accuracy_estimate}%`)
    ]));
    children.push(spacer(100));
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
      footers: {
        default: new Footer({
          children: [p(run("AgentForgeX Process Analysis Report", { color: HEX.inkSoft, size: 16 }), { alignment: AlignmentType.CENTER })]
        })
      },
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(process.title || "Process").replace(/\s+/g, "_")}_Report.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
