import React, { useRef, useState, useEffect } from "react";
import { Download, Loader2, FileText, Presentation, File as FileIcon, ChevronDown } from "lucide-react";

// Native Generators
import { generateProcessPDF } from "../../utils/processPdfGenerator";
import { generateProcessDOCX } from "../../utils/processDocxGenerator";
import { generateProcessPPTX } from "../../utils/processPptxGenerator";

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
      if (format === "pdf") {
        await generateProcessPDF(data);
      } else if (format === "word") {
        await generateProcessDOCX(data);
      } else if (format === "pptx") {
        await generateProcessPPTX(data);
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
        <div className="absolute right-0 top-10 w-48 bg-[#0e0e10] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 flex flex-col gap-1">
            <button
              onClick={() => handleDownload("pdf")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
            >
              <FileIcon size={14} className="text-red-500" />
              <span>Export as PDF</span>
            </button>
            <button
              onClick={() => handleDownload("word")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
            >
              <FileText size={14} className="text-blue-500" />
              <span>Export as Word</span>
            </button> 
             <button
              onClick={() => handleDownload("pptx")}
              className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
            >
              <Presentation size={14} className="text-orange-500" />
              <span>Export as PPT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

