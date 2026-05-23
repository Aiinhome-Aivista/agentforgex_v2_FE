/**
 * SuggestionExportPdf.jsx — UPDATED
 *
 * Spec section 3:
 *   In the download dropdown (already shows Export as PDF / Word / PowerPoint),
 *   ADD a new entry: **"Download the Code"** which downloads a ZIP containing
 *   the generated source code/scripts for the workflow automation.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Download, Loader2, FileText, Presentation,
  File as FileIcon, ChevronDown, FileArchive,
} from "lucide-react";
import {
  getTechnicalDesign, getProcessFlow, downloadSuggestionCode,
} from "../../services/api";
import { generatePDF  } from "../../utils/pdfGenerator";
import { generateDOCX } from "../../utils/docxGenerator";
import { generatePPTX } from "../../utils/pptxGenerator";

// ─── Format options ──────────────────────────────────────────────────────────
// `kind: "doc"` items are document exports (PDF / DOCX / PPTX).
// `kind: "code"` is the new ZIP download — different code path.
const FORMATS = [
  { id: "pdf",  kind: "doc",  label: "Export as PDF",        Icon: FileIcon,     iconCls: "text-red-400",    fn: generatePDF  },
  { id: "word", kind: "doc",  label: "Export as Word",       Icon: FileText,     iconCls: "text-blue-400",   fn: generateDOCX },
  { id: "pptx", kind: "doc",  label: "Export as PowerPoint", Icon: Presentation, iconCls: "text-orange-400", fn: generatePPTX },
  // ─── NEW ───────────────────────────────────────────────────────────────
  { id: "code", kind: "code", label: "Download the Code",    Icon: FileArchive,  iconCls: "text-emerald-400" },
];

function unwrap(res) {
  if (!res) return res;
  if (res.data !== undefined && (res.status !== undefined || res.config !== undefined)) {
    return res.data;
  }
  return res;
}

export default function SuggestionExportPdf({ suggestion, processData }) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState(null);
  const [showFormats, setShowFormats] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState("error");
  const menuRef = useRef(null);

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

      // ── NEW: source-code ZIP path ─────────────────────────────────────
      if (format.kind === "code") {
        const { filename } = await downloadSuggestionCode(suggestionId);
        toast(`Code bundle downloaded${filename ? `: ${filename}` : ''}.`, "success");
        return;
      }

      // ── Existing document export path ─────────────────────────────────
      const analysisId =
        processData?.process?._key ||
        processData?.process?.id ||
        suggestion?.analysisId ||
        suggestionId;

      const [designRes, flowRes] = await Promise.allSettled([
        getTechnicalDesign(suggestionId),
        getProcessFlow(analysisId),
      ]);

      if (designRes.status !== "fulfilled") {
        throw new Error(designRes.reason?.message || "Failed to fetch technical design.");
      }

      const design = unwrap(designRes.value);
      if (!design || !(design.sections || design.document || design.document_metadata || design.cover_page)) {
        throw new Error("Invalid or empty technical-design payload.");
      }

      // Prefer the workflow graph that the technical-design endpoint built
      // (canonical, with Start/End nodes).  The backend may emit it under
      // either key — accept both.  Fall back to the /flow endpoint last.
      const flow =
        design?.workflow_graph ||
        design?.agentic_workflow_graph ||
        (flowRes.status === "fulfilled" ? unwrap(flowRes.value) : null);

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

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => !isExporting && setShowFormats((v) => !v)}
          disabled={isExporting}
          className="btn-primary px-4 py-2 h-10 shadow-lg shadow-brand-500/20 flex items-center gap-2 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
          title="Export Suggestion"
          aria-expanded={showFormats}
          aria-haspopup="true"
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin text-black" />
              <span className="text-black text-xs font-bold uppercase tracking-widest">
                {activeFormat === "code" ? "Generating Code" : (activeFormat?.toUpperCase() ?? "…")}
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
              absolute right-0 top-12 w-56
              bg-[#0a0d18] border border-white/10 rounded-xl shadow-2xl
              z-[100] overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-150
            "
            role="menu"
          >
            <div className="p-2 flex flex-col gap-0.5">
              {FORMATS.map(({ id, label, Icon, iconCls, kind }) => (
                <React.Fragment key={id}>
                  {/* Visual divider before the code option */}
                  {kind === "code" && (
                    <div className="my-1 border-t border-white/10" />
                  )}
                  <button
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
                    {kind === "code" && (
                      <span className="ml-auto text-[8px] text-emerald-400/70">ZIP</span>
                    )}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
