import React, { useRef, useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, ImageRun } from "docx";
import pptxgen from "pptxgenjs";
import { Download, Loader2, FileText, Presentation, File as FileIcon, ChevronDown } from "lucide-react";
import { PDFProvider } from "../../context/PdfContext";
import PdfTemplate from "./PdfTemplate";
import { getTechnicalDesign } from "../../services/api";

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SuggestionExportPdf({ suggestion, processData }) {
  const [isExporting, setIsExporting] = useState(false);
  const [technicalDesign, setTechnicalDesign] = useState(null);
  const [toastError, setToastError] = useState(null);
  const [showFormats, setShowFormats] = useState(false);
  const printContainerRef = useRef();
  const printStyleRef = useRef(null);
  const menuRef = useRef();

  // Handle clicking outside to close dropdown
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('suggestion-pdf-printing');
    };
  }, []);

  const captureAtoms = async () => {
    const element = printContainerRef.current;
    const atoms = element.querySelectorAll('.pdf-atomic');
    return Array.from(atoms);
  };

  const exportToPdf = async (atoms, processTitle) => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (2 * margin);
    const usableHeightMm = pageHeight - (2 * margin);

    let currentYMm = margin;
    let isFirstPage = true;

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const atomWidthPx = canvas.width;
      const atomHeightPx = canvas.height;
      const pxPerMm = atomWidthPx / contentWidth;
      const atomHeightMm = atomHeightPx / pxPerMm;

      const remainingSpaceMm = pageHeight - margin - currentYMm;
      const forcePageBreak = atom.classList.contains('pdf-print-page-break');

      if (!isFirstPage && (forcePageBreak || atomHeightMm > remainingSpaceMm - 10)) {
        pdf.addPage();
        currentYMm = margin;
      }

      if (atomHeightMm > usableHeightMm) {
        let yOffsetPx = 0;
        while (yOffsetPx < atomHeightPx) {
          if (yOffsetPx > 0) {
            pdf.addPage();
            currentYMm = margin;
          }
          const sliceHeightPx = Math.min(usableHeightMm * pxPerMm, atomHeightPx - yOffsetPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = atomWidthPx;
          sliceCanvas.height = sliceHeightPx;
          const ctx = sliceCanvas.getContext('2d');
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, yOffsetPx, atomWidthPx, sliceHeightPx, 0, 0, atomWidthPx, sliceHeightPx);

          const sliceImgData = sliceCanvas.toDataURL("image/png");
          pdf.addImage(sliceImgData, "PNG", margin, currentYMm, contentWidth, sliceHeightPx / pxPerMm);
          yOffsetPx += (usableHeightMm * pxPerMm);
          currentYMm += (sliceHeightPx / pxPerMm);
        }
      } else {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, currentYMm, contentWidth, atomHeightMm);
        currentYMm += atomHeightMm + 5;
      }
      isFirstPage = false;
    }
    pdf.save(`${processTitle?.replace(/\s+/g, "_") || "Suggestion"}_Report.pdf`);
  };

  const exportToWord = async (atoms, processTitle) => {
    const children = [];

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 600; // Standard Word page width in points roughly
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imgData,
              transformation: {
                width: imgWidth,
                height: imgHeight,
              },
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [{
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${processTitle?.replace(/\s+/g, "_") || "Suggestion"}_Report.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPowerPoint = async (atoms, processTitle) => {
    const pptx = new pptxgen();

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const slide = pptx.addSlide();
      
      // Add image to slide, fitting width
      slide.addImage({
        data: imgData,
        x: 0.5,
        y: 0.5,
        w: 9, // pptxgenjs uses inches by default
        h: (canvas.height * 9) / canvas.width,
        sizing: { type: 'contain', w: 9, h: 5 }
      });
    }

    await pptx.writeFile({ fileName: `${processTitle?.replace(/\s+/g, "_") || "Suggestion"}_Report.pptx` });
  };

  const handleDownload = useCallback(async (format) => {
    setIsExporting(true);
    setToastError(null);
    setShowFormats(false);

    try {
      const currentSuggestionId = suggestion?.id || suggestion?._key;
      if (!currentSuggestionId) {
        throw new Error("Suggestion ID is missing");
      }
      
      const response = await getTechnicalDesign(currentSuggestionId);
      const pdfData = response?.data || response;
      if (pdfData && (pdfData.sections || pdfData.document || pdfData.document_metadata || pdfData.cover_page)) {
        setTechnicalDesign(pdfData);
      } else {
        throw new Error(response?.message || "Invalid data received from API");
      }

      // The container is already fixed offscreen left: -9999px, html2canvas can capture it.
      // We just need to make sure the width is set correctly for A4 portrait.
      const printContainer = printContainerRef.current;
      printContainer.style.width = "794px"; // Fixed width for A4 portrait rendering (96dpi)

      // Wait for React to render the template with the new data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const atoms = await captureAtoms();
      if (atoms.length > 0) {
        const title = suggestion?.title || "Suggestion_Report";
        if (format === "pdf") {
          await exportToPdf(atoms, title);
        } else if (format === "word") {
          await exportToWord(atoms, title);
        } else if (format === "pptx") {
          await exportToPowerPoint(atoms, title);
        }
      }

    } catch (error) {
      console.error("PDF Export failed:", error);
      setToastError(error.message || "An error occurred during PDF export.");
      setTimeout(() => setToastError(null), 4000);
    } finally {
      const printContainer = printContainerRef.current;
      if (printContainer) {
        printContainer.style.width = "100%";
      }
      setIsExporting(false);
    }
  }, [suggestion, processData]);

  const suggestionId = suggestion?.id || suggestion?._key;
  const process = processData?.process;

  return (
    <>
      {toastError && (
        <div className="fixed bottom-6 right-6 bg-red-500/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl shadow-red-500/20 z-[9999] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold">{toastError}</span>
        </div>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowFormats(!showFormats)}
          disabled={isExporting}
          className="btn-primary px-4 py-2 h-10 shadow-lg shadow-brand-500/20 flex items-center gap-2 rounded-md"
          title="Export Suggestion"
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin text-black" />
            </>
          ) : (
            <>
              <Download size={18} className="text-black" />
              <ChevronDown size={14} className="text-black opacity-50" />
            </>
          )}
        </button>

        {showFormats && (
          <div className="absolute right-0 top-12 w-48 bg-[#0e0e10] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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

      {/* Hidden container — moved to body during print */}
      <div
        ref={printContainerRef}
        style={{
          position: "fixed",
          zIndex: -9999,
          top: 0,
          left: "-9999px",
          pointerEvents: "none",
          background: "#fff",
          width: "100%",
        }}
      >
        <div
          className="pdf-print-inner"
          style={{
            width: "100%",
            background: "#ffffff",
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "#111",
            textAlign: "left"
          }}
        >
          <PDFProvider value={true}>
            {/* ══════════════ TECHNICAL DESIGN ══════════════ */}
            {technicalDesign && (
              <PdfTemplate data={technicalDesign} suggestionTitle={suggestion?.title} />
            )}
          </PDFProvider>
        </div>
      </div>
    </>
  );
}
