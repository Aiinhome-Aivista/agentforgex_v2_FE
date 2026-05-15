import React, { useRef, useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";
import { PDFProvider } from "../../context/PdfContext";
import PdfTemplate from "./PdfTemplate";
import { getTechnicalDesign } from "../../services/api";
import demoData from "../../pages/demo.json";

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function SuggestionExportPdf({ suggestion, processData }) {
  const [isExporting, setIsExporting] = useState(false);
  const [technicalDesign, setTechnicalDesign] = useState(null);
  const [toastError, setToastError] = useState(null);
  const printContainerRef = useRef();
  const printStyleRef = useRef(null);

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

  const handleDownload = useCallback(async () => {
    setIsExporting(true);

    try {
      // Use demo JSON data instead of API call
      setTechnicalDesign(demoData);

      // The container is already fixed offscreen left: -9999px, html2canvas can capture it.
      // We just need to make sure the width is set correctly for A4 portrait.
      const printContainer = printContainerRef.current;
      printContainer.style.width = "794px"; // Fixed width for A4 portrait rendering (96dpi)

      // Wait for React to render the template with the new data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const atoms = await captureAtoms();
      if (atoms.length > 0) {
        const title = processData?.process?.title || suggestion?.title || "Automation_Suggestion";
        await exportToPdf(atoms, title);
      }

    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      const printContainer = printContainerRef.current;
      if (printContainer) {
        printContainer.style.width = "100%";
      }
      setIsExporting(false);
    }
  }, [suggestion, processData, technicalDesign]);

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

      <button
        onClick={handleDownload}
        disabled={isExporting}
        className="btn-primary px-4 py-2 h-10 shadow-lg shadow-brand-500/20 flex items-center gap-2"
        title="Export Suggestion to PDF"
      >
        {isExporting ? (
          <>
            <Loader2 size={18} className="animate-spin text-black" />
            <span className="text-black font-semibold text-sm">Preparing...</span>
          </>
        ) : (
          <>
            <Download size={18} className="text-black" />
          </>
        )}
      </button>

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
          }}
        >
          <PDFProvider value={true}>
            {/* ══════════════ TECHNICAL DESIGN ══════════════ */}
            {technicalDesign && (
              <PdfTemplate data={technicalDesign} />
            )}
          </PDFProvider>
        </div>
      </div>
    </>
  );
}
