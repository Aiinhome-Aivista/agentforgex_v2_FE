/**
 * processPptxGenerator.js — AgentForgeX Process Analysis Report
 * 
 * Native PPTX generation using pptxgenjs.
 */

import pptxgen from "pptxgenjs";

const T = {
  paper:     "FFFFFF",
  ink:       "0F172A",
  inkSoft:   "475569",
  rule:      "E2E8F0",
  surface:   "F8FAFC",
  brand:     "10B981",
  brandDk:   "059669",
  navy:      "1E293B",
};

function addHeader(slide, title) {
  slide.addText("AgentForgeX", { x: 0.3, y: 0.2, w: 2, h: 0.3, fontSize: 10, bold: true, color: T.brand });
  slide.addText(title || "Process Analysis", { x: 7, y: 0.2, w: 2.7, h: 0.3, fontSize: 10, color: T.inkSoft, align: "right" });
  slide.addShape("line", { x: 0.3, y: 0.5, w: 9.4, h: 0, line: { color: T.rule, width: 0.5 } });
}

export async function generateProcessPPTX(data) {
  const pptx = new pptxgen();
  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = data;

  // 1. Cover
  const cover = pptx.addSlide();
  cover.background = { color: T.navy };
  cover.addText("AgentForgeX", { x: 0.5, y: 1, w: 4, h: 1, fontSize: 32, bold: true, color: T.paper });
  cover.addText("PROCESS INTELLIGENCE REPORT", { x: 0.5, y: 1.8, w: 4, h: 0.5, fontSize: 12, color: T.brand, bold: true });
  cover.addText(process.title || "Process Analysis", { x: 0.5, y: 3.5, w: 9, h: 1, fontSize: 28, bold: true, color: T.paper });
  cover.addText(`Automation Potential: ${process.automation_score}%`, { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 18, color: T.brand });

  // 2. Insights
  const insSlide = pptx.addSlide();
  addHeader(insSlide, "Key Process Insights");
  insSlide.addText("Key Process Insights", { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 24, bold: true, color: T.navy });
  key_insights?.slice(0, 5).forEach((ins, i) => {
    insSlide.addText(`• ${ins.text}`, { x: 0.7, y: 1.5 + i * 0.8, w: 8.5, h: 0.6, fontSize: 14, color: T.ink });
  });

  // 3. Targets
  const targetSlide = pptx.addSlide();
  addHeader(targetSlide, "Top Automation Targets");
  targetSlide.addText("Top Automation Targets", { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 24, bold: true, color: T.navy });
  const rows = [
    ["Rank", "Process", "Actor", "Potential"].map(h => ({ text: h, options: { bold: true, fill: T.navy, color: T.paper } })),
    ...(top_automation_targets || []).slice(0, 8).map((t, i) => [String(i + 1), t.title, t.actor, `${t.automation_potential}%`])
  ];
  targetSlide.addTable(rows, { x: 0.5, y: 1.5, w: 9, colW: [0.8, 4.2, 2.5, 1.5], border: { type: "solid", color: T.rule } });

  // 4. Steps (one or more slides)
  if (steps?.length) {
    const stepsPerPage = 3;
    for (let i = 0; i < steps.length; i += stepsPerPage) {
      const stepSlide = pptx.addSlide();
      addHeader(stepSlide, "Process Step Breakdown");
      stepSlide.addText("Process Step Breakdown", { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 24, bold: true, color: T.navy });
      steps.slice(i, i + stepsPerPage).forEach((step, j) => {
        const y = 1.5 + j * 1.8;
        stepSlide.addShape("rect", { x: 0.5, y, w: 9, h: 1.6, fill: T.surface, line: { color: T.rule, width: 1 } });
        stepSlide.addText(step.title, { x: 0.7, y: y + 0.1, w: 6, h: 0.4, fontSize: 16, bold: true, color: T.navy });
        stepSlide.addText(`${step.automation_potential}% POTENTIAL`, { x: 7, y: y + 0.1, w: 2.3, h: 0.3, fontSize: 10, bold: true, color: T.paper, fill: T.brand, align: "center" });
        stepSlide.addText(step.description, { x: 0.7, y: y + 0.6, w: 8.6, h: 0.8, fontSize: 12, color: T.ink, wrap: true });
      });
    }
  }

  // 5. ERP Modules
  const erpSlide = pptx.addSlide();
  addHeader(erpSlide, "System & Module Inventory");
  erpSlide.addText("System & Module Inventory", { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 24, bold: true, color: T.navy });
  erp_modules?.slice(0, 4).forEach((mod, i) => {
    const y = 1.5 + i * 1.2;
    erpSlide.addText(mod.module_name, { x: 0.5, y, w: 4, h: 0.3, fontSize: 14, bold: true, color: T.brand });
    erpSlide.addText(mod.description, { x: 0.5, y: y + 0.3, w: 9, h: 0.6, fontSize: 11, color: T.inkSoft });
  });

  // 6. Suggestions
  const sugSlide = pptx.addSlide();
  addHeader(sugSlide, "Automation Opportunities");
  sugSlide.addText("Automation Opportunities", { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 24, bold: true, color: T.navy });
  suggestions?.slice(0, 4).forEach((s, i) => {
    const y = 1.5 + i * 1.2;
    sugSlide.addText(s.title, { x: 0.5, y, w: 6, h: 0.3, fontSize: 14, bold: true, color: T.navy });
    sugSlide.addText(`ROI: ${s.roi_impact} | Effort: ${s.effort_level}`, { x: 7, y, w: 2.5, h: 0.3, fontSize: 10, color: T.brand, align: "right" });
    sugSlide.addText(s.description, { x: 0.5, y: y + 0.3, w: 9, h: 0.5, fontSize: 11, color: T.inkSoft });
  });

  await pptx.writeFile({ fileName: `${(process.title || "Process").replace(/\s+/g, "_")}_Report.pptx` });
}
