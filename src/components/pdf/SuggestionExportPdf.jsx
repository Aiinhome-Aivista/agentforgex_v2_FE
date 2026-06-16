/**
 * SuggestionExportPdf.jsx — UPDATED for Scenario 2
 *
 * Dropdown now has THREE sections:
 *   • TECHNICAL DESIGN     — Export as PDF / Word / PowerPoint  (unchanged)
 *   • CODE                 — Download the Code (ZIP)             (unchanged)
 *   • BLUEPRINT (NEW)      — Export Blueprint PDF / Word / PowerPoint
 *                            calls /api/suggestions/<id>/blueprint-export
 *
 * The Blueprint entries fetch their content from the dedicated suggestion-
 * level blueprint API and pass it to the new generateSuggestionBlueprint*
 * generators.  Existing flow + functionality is untouched.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Download, Loader2, FileText, Presentation,
  File as FileIcon, ChevronDown, FileArchive,
  Layers,
} from "lucide-react";
import {
  getTechnicalDesign, getProcessFlow, downloadSuggestionCode,
} from "../../services/api";
import { generatePDF } from "../../utils/pdfGenerator";
import { generateDOCX } from "../../utils/docxGenerator";
import { generatePPTX } from "../../utils/pptxGenerator";

// NEW — suggestion-focused blueprint generators (Scenario 2)
import { generateSuggestionBlueprintPDF } from "../../utils/processPdfGenerator";
import { generateSuggestionBlueprintDOCX } from "../../utils/processDocxGenerator";
import { generateSuggestionBlueprintPPTX } from "../../utils/processPptxGenerator";

// ─── Format options ──────────────────────────────────────────────────────────
// kind: "doc"        → existing technical-design exports (PDF / DOCX / PPTX)
// kind: "code"       → existing source-code ZIP download
// kind: "blueprint"  → NEW per Scenario 2 — calls the suggestion blueprint API
const FORMATS = [
  // Technical Design
  // { id: "pdf", kind: "doc", label: "Export as PDF", Icon: FileIcon, iconCls: "text-red-400", fn: generatePDF },
  // { id: "word", kind: "doc", label: "Export as Word", Icon: FileText, iconCls: "text-blue-400", fn: generateDOCX },
  // { id: "pptx", kind: "doc", label: "Export as PowerPoint", Icon: Presentation, iconCls: "text-orange-400", fn: generatePPTX },
  // // Code
  { id: "code", kind: "code", label: "Download the Code", Icon: FileArchive, iconCls: "text-emerald-400" },
  // Blueprint (NEW)
  { id: "bp-pdf", kind: "blueprint", label: "Export Blueprint PDF", Icon: FileIcon, iconCls: "text-red-300", fn: generateSuggestionBlueprintPDF },
  { id: "bp-word", kind: "blueprint", label: "Export Blueprint Word", Icon: FileText, iconCls: "text-blue-300", fn: generateSuggestionBlueprintDOCX },
  { id: "bp-pptx", kind: "blueprint", label: "Export Blueprint PowerPoint", Icon: Presentation, iconCls: "text-orange-300", fn: generateSuggestionBlueprintPPTX },
];

function unwrap(res) {
  if (!res) return res;
  if (res.data !== undefined && (res.status !== undefined || res.config !== undefined)) {
    return res.data;
  }
  return res;
}

export default function SuggestionExportPdf({ suggestion, processData, onDropdownOpenChange }) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState(null);
  const [showFormats, setShowFormats] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("error");
  const menuRef = useRef(null);

  useEffect(() => {
    if (onDropdownOpenChange) {
      onDropdownOpenChange(showFormats);
    }
  }, [showFormats, onDropdownOpenChange]);

  useEffect(() => {
    if (!showFormats) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowFormats(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFormats]);

  const toast = useCallback((msg, type = "error") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  const handleDownload = useCallback(async (formatId) => {
    if (isExporting) return;
    const format = FORMATS.find((f) => f.id === formatId);
    if (!format) return;

    setIsExporting(true);
    setActiveFormat(formatId);
    setShowFormats(false);

    try {
      const suggestionId = suggestion?.id || suggestion?._key;
      if (!suggestionId) throw new Error("Suggestion ID is missing.");

      // ── Source-code ZIP path ─────────────────────────────────────────
      if (format.kind === "code") {
        const { filename } = await downloadSuggestionCode(suggestionId);
        toast(`Code bundle downloaded${filename ? `: ${filename}` : ''}.`, "success");
        return;
      }

      // ── NEW: Blueprint path (Scenario 2) ─────────────────────────────
      // The blueprint generators fetch their payload themselves via
      // /api/suggestions/<id>/blueprint-export — no extra data needed.
      if (format.kind === "blueprint") {
        await format.fn(suggestionId);
        toast("Blueprint export complete!", "success");
        return;
      }

      // ── Existing technical-design export path (unchanged) ────────────
      const [designRes, flowRes] = await Promise.allSettled([
        getTechnicalDesign(suggestionId),
        getProcessFlow(suggestionId),
      ]);

      if (designRes.status !== "fulfilled") {
        throw new Error(designRes.reason?.message || "Failed to fetch technical design.");
      }

      const design = unwrap(designRes.value);
      if (!design || !(design.sections || design.document || design.document_metadata || design.cover_page)) {
        throw new Error("Invalid or empty technical-design payload.");
      }

      const flow =
        (flowRes.status === "fulfilled" ? unwrap(flowRes.value) : null) ||
        design?.workflow_graph ||
        design?.agentic_workflow_graph;

      if (flowRes.status !== "fulfilled") {
        console.warn("[ExportPdf] /flow fetch failed; using design.workflow_graph:", flowRes.reason);
      }

      const title =
        suggestion?.title ||
        design?.cover_page?.title ||
        "AgentForgeX_Technical_Design";

      await format.fn(design, title, flow);
      toast("Export complete!", "success");
    } catch (err) {
      console.error(`[ExportPdf] ${formatId} export failed:`, err);
      toast(err.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setActiveFormat(null);
    }
  }, [isExporting, suggestion, processData, toast]);

  // Pretty label for the spinner while exporting
  const labelForActive = (id) => {
    if (!id) return "…";
    if (id === "code") return "Generating Code";
    if (id.startsWith("bp-")) return "Blueprint";
    return id.toUpperCase();
  };

  // Group items by kind so the dropdown can show section headers
  const techItems = FORMATS.filter((f) => f.kind === "doc");
  const codeItems = FORMATS.filter((f) => f.kind === "code");
  const bpItems = FORMATS.filter((f) => f.kind === "blueprint");

  return (
    <>
      {toastMsg && (
        <div
          className={`
            fixed bottom-6 right-6 z-[9999] flex items-center gap-3
            px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md
            animate-in fade-in slide-in-from-bottom-4 duration-200
            ${toastType === "success"
              ? "bg-emerald-500/90 shadow-emerald-500/20"
              : "bg-red-500/90 shadow-red-500/20"}
          `}
        >
          {toastType === "success" ? (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-semibold text-white">{toastMsg}</span>
        </div>
      )}

      <div className="relative z-30" ref={menuRef}>
        <button
          onClick={() => !isExporting && setShowFormats((v) => !v)}
          disabled={isExporting}
          className="btn-primary px-4 py-2 h-10 flex items-center gap-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
          title="Export Suggestion"
          aria-expanded={showFormats}
          aria-haspopup="true"
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin text-black" />
              <span className="text-black text-xs font-bold uppercase tracking-widest">
                {labelForActive(activeFormat)}
              </span>
            </>
          ) : (
            <>
              <Download size={18} className="text-black" />
              <ChevronDown
                size={14}
                className={`text-black opacity-50 transition-transform duration-200 ${showFormats ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {showFormats && (
          <div
            className="
              absolute right-0 top-12 w-64
    bg-[#0a0d18]
   shadow-[0_12px_40px_rgba(0,0,0,0.8)]
    border border-white/10
    rounded-xl
    z-[9999]
    overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-150
            "
            role="menu"
          >
            <div className="p-1 flex flex-col gap-0.5">

              {/* Technical-design section */}
              {/* {techItems.map(({ id, label, Icon, iconCls }) => (
                <button
                  key={id}
                  onClick={() => handleDownload(id)}
                  className="
                    w-full flex items-center gap-3 px-3 py-2.5
                    text-[10px] font-bold uppercase tracking-widest
                    text-white/60 hover:text-brand-500 hover:bg-brand-500/10
                    rounded-lg transition-all duration-150 text-left
                  "
                  role="menuitem"
                >
                  <Icon size={14} className={iconCls} />
                  <span>{label}</span>
                </button>
              ))} */}
              {/* Code section */}
              {codeItems.length > 0 && (
                <div className=" my-1" />
              )}
              {codeItems.map(({ id, label, Icon, iconCls }) => (
                <button
                  key={id}
                  onClick={() => handleDownload(id)}
                  className="
                    w-full flex items-center gap-3 px-3 py-2.5
                    text-[10px] font-bold uppercase tracking-widest
                    text-white/60 hover:text-brand-500 hover:bg-brand-500/10
                    rounded-lg transition-all duration-150 text-left
                  "
                  role="menuitem"
                >
                  <Icon size={14} className={iconCls} />
                  <span>{label}</span>
                  <span className="ml-auto text-[8px] text-emerald-400/70">ZIP</span>
                </button>
              ))}
               <div className="border-t border-white/10 my-1" />

 
              {/* Blueprint section (NEW) */}
              {bpItems.length > 0 && (
                <>
                  {/* <div className="my-1" />  */}
                  <div className="px-3 py-1.5 flex items-center gap-2">
                    <Layers size={11} className="text-brand-500/80" />
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-500/80">
                      Blueprint Transformation
                    </span>
                  </div>
                </>
              )}
              {bpItems.map(({ id, label, Icon, iconCls }) => (
                <button
                  key={id}
                  onClick={() => handleDownload(id)}
                  className="
                    w-full flex items-center gap-3 px-3 py-2.5
                    text-[10px] font-bold uppercase tracking-widest
                    text-white/60 hover:text-brand-500 hover:bg-brand-500/10
                    rounded-lg transition-all duration-150 text-left
                  "
                  role="menuitem"
                >
                  <Icon size={14} className={iconCls} />
                  <span>{label}</span>
                </button>
              ))}



            </div>
          </div>
        )}
      </div>
    </>
  );
}
