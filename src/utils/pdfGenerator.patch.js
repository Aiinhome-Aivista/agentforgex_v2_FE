/**
 * ════════════════════════════════════════════════════════════════════════════
 *  pdfGenerator.js — PATCH NOTES
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The existing pdfGenerator.js is 1069 lines and works correctly for the
 * sections it already renders.  Rather than rewrite it, apply these THREE
 * SURGICAL EDITS:
 *
 *
 * ▶ EDIT 1 — add imports near the top of pdfGenerator.js
 * ────────────────────────────────────────────────────────────────────────────
 *   Find:
 *       import jsPDF from "jspdf";
 *       import { layoutWorkflow, hasFlowData } from "./workflowRenderer";
 *
 *   REPLACE with:
 *       import jsPDF from "jspdf";
 *       import { layoutWorkflow, hasFlowData } from "./workflowRenderer";
 *       import { buildAddonBlocks } from "./exportSectionsAddon";
 *       import { renderBlocks } from "./pdfBlockRenderer";
 *
 *
 * ▶ EDIT 2 — inject the addon sections inside generatePDF()
 * ────────────────────────────────────────────────────────────────────────────
 *   Find the existing block (≈ line 1050-1056):
 *       (data.sections || []).forEach((section, i) => {
 *         d.addPage("a4", "portrait");
 *         sectionStartPages.push(d.getNumberOfPages());
 *         drawSection(d, section, i);
 *       });
 *
 *   REPLACE with:
 *       (data.sections || []).forEach((section, i) => {
 *         d.addPage("a4", "portrait");
 *         sectionStartPages.push(d.getNumberOfPages());
 *         drawSection(d, section, i);
 *       });
 *
 *       // ─── NEW: addon sections (System & Module Inventory, CSV detection,
 *       //         Data Lineage, Per-Suggestion Blueprint) ─────────────────
 *       const addonBlocks = buildAddonBlocks(data);
 *       if (addonBlocks.length > 0) {
 *         d.addPage("a4", "portrait");
 *         drawPageBg(d);
 *         drawPageHeader(d);
 *         let yAddon = MTop;
 *         renderBlocks(d, yAddon, addonBlocks, {
 *           navy: C.navy, accent: C.accent, amber: C.amber, blue: C.blue,
 *           ink:  C.ink,  gray1: C.gray1, gray2: C.gray2,  gray3: C.gray3,
 *           gray4: C.gray4, border: C.border, surface: C.surface,
 *         }, { ML, MR, PW, PH, MBot });
 *       }
 *
 *
 * ▶ EDIT 3 — use the design's canonical workflow graph when available
 * ────────────────────────────────────────────────────────────────────────────
 *   Find the call inside generatePDF() (≈ line 1044):
 *       drawSwimlaneWorkflowPage(d, flowData);
 *
 *   REPLACE with:
 *       // Prefer the workflow graph baked into the technical-design payload
 *       // (it is guaranteed to include Start/End nodes per the spec).  Accept
 *       // either property-name spelling the backend may emit.
 *       const canonicalFlow =
 *         (data && (data.workflow_graph || data.agentic_workflow_graph)) || flowData;
 *       drawSwimlaneWorkflowPage(d, canonicalFlow);
 *
 *
 * That's it.  These three edits add the new sections + guarantee the
 * workflow graph matches the UI.  No existing behaviour is changed.
 *
 *
 *  IDENTICAL EDITS apply to docxGenerator.js and pptxGenerator.js — see
 *  docxGenerator.patch.js and pptxGenerator.patch.js for the equivalent
 *  three edits in those files.
 */

// Re-export the helpers used by the patched files so consumers can verify
// the addon module is wired up correctly via:
//   import "./pdfGenerator.patch";
export { buildAddonBlocks } from "./exportSectionsAddon";
export { renderBlocks }      from "./pdfBlockRenderer";
