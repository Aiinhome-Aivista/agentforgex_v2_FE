import React, { useRef, useState, useEffect } from "react";
import { Download, Loader2, FileText, Presentation, File as FileIcon, ChevronDown } from "lucide-react";

// Native Generators (Blueprint - Current)
import { generateProcessPDF } from "../../utils/processPdfGenerator";
import { generateProcessDOCX } from "../../utils/processDocxGenerator";
import { generateProcessPPTX } from "../../utils/processPptxGenerator";

// Native Generators (Legacy)
import { generateProcessPDFLegacy } from "../../utils/processPdfGeneratorLegacy";
import { generateProcessDOCXLegacy } from "../../utils/processDocxGeneratorLegacy";
import { generateProcessPPTXLegacy } from "../../utils/processPptxGeneratorLegacy";

export default function ExportPDF({ data }) {
  const [isExporting, setIsExporting] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowFormats(false);
      }
    };

    if (showFormats) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFormats]);

  const handleDownload = async (format) => {
    setIsExporting(true);
    setShowFormats(false);
    try {
      if (format === "blueprint-pdf") {
        await generateProcessPDF(data);
      } else if (format === "blueprint-word") {
        await generateProcessDOCX(data);
      } else if (format === "blueprint-pptx") {
        await generateProcessPPTX(data);
      } else if (format === "legacy-pdf") {
        await generateProcessPDFLegacy(data);
      } else if (format === "legacy-word") {
        await generateProcessDOCXLegacy(data);
      } else if (format === "legacy-pptx") {
        await generateProcessPPTXLegacy(data);
      }
    } catch (error) {
      console.error(`${format} Export failed:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowFormats(!showFormats)}
        disabled={isExporting}
        className="btn-primary px-3 py-1.5 shadow-lg shadow-brand-500/20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest rounded-md"
        title="Export Analysis"
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin text-black" />
        ) : (
          <>
            <Download size={18} className="text-black" />
            <ChevronDown size={14} className="text-black opacity-50" />
          </>
        )}
      </button>

      {showFormats && (
        <div className="absolute right-0 top-10 w-60 bg-[#0e0e10]/95 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
          <div className="p-2 flex flex-col gap-1">
            
            {/* Blueprint Section */}
            <div className="px-3 py-1.5 text-[9px] font-extrabold text-brand-500 uppercase tracking-widest opacity-80">
              Blueprint Transformation
            </div>
            
            <button
              onClick={() => handleDownload("blueprint-pdf")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <FileIcon size={14} className="text-emerald-400" />
              <span>Export Blueprint PDF</span>
            </button>
            <button
              onClick={() => handleDownload("blueprint-word")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <FileText size={14} className="text-blue-400" />
              <span>Export Blueprint Word</span>
            </button> 
            <button
              onClick={() => handleDownload("blueprint-pptx")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/80 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <Presentation size={14} className="text-orange-400" />
              <span>Export Blueprint PPT</span>
            </button>

            {/* Visual Divider */}
            <div className="my-1 border-t border-white/10" />

            {/* Legacy Section */}
            <div className="px-3 py-1.5 text-[9px] font-extrabold text-gray-400 uppercase tracking-widest opacity-80">
              Legacy Analysis
            </div>
            
            <button
              onClick={() => handleDownload("legacy-pdf")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <FileIcon size={14} className="text-red-400/80" />
              <span>Export Legacy PDF</span>
            </button>
            <button
              onClick={() => handleDownload("legacy-word")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <FileText size={14} className="text-blue-400/80" />
              <span>Export Legacy Word</span>
            </button> 
            <button
              onClick={() => handleDownload("legacy-pptx")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-all text-left"
            >
              <Presentation size={14} className="text-orange-400/80" />
              <span>Export Legacy PPT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

