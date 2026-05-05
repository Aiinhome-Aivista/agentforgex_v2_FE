import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2, } from "lucide-react";
import { PDFProvider } from "../../context/PdfContext";

import AutomationTab from "../analysis/AutomationTab";
import ERPContextTab from "../analysis/ERPContextTab";
import OverviewTab from "../analysis/OverviewTab";

export default function ExportPDF({ data }) {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef();

  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = data;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const element = pdfRef.current;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      const usableHeightMm = pageHeight - (2 * margin);

      // Wait for components and charts to fully render
      await new Promise(resolve => setTimeout(resolve, 3000));

      const atoms = element.querySelectorAll('.pdf-atomic');
      if (atoms.length === 0) return;

      let currentYMm = margin;
      let isFirstPage = true;

      for (let i = 0; i < atoms.length; i++) {
        const atom = atoms[i];

        // Capture individual atom
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

        // Aggressive safety buffer (10mm) to ensure elements far away from page edges
        const remainingSpaceMm = pageHeight - margin - currentYMm;

        if (!isFirstPage && (atomHeightMm > remainingSpaceMm - 10)) {
          pdf.addPage();
          currentYMm = margin;
        }

        // Handle case where a single atom is taller than the whole page (e.g. huge table)
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
          // Standard size atom: just add it
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", margin, currentYMm, contentWidth, atomHeightMm);
          currentYMm += atomHeightMm + 5; // 5mm gap between atoms
        }

        isFirstPage = false;
      }

      pdf.save(`${process.title?.replace(/\s+/g, "_") || "Process"}_Report.pdf`);
    } catch (error) {
      console.error("Atomic PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isExporting}
        className="btn-primary px-4 py-2 h-10 shadow-lg shadow-brand-500/20"
        title="Export Analysis to PDF"
      >
        {isExporting ? (
          <>
            <Loader2 size={18} className="animate-spin text-black" />

          </>
        ) : (
          <>
            <Download size={18} className="text-black" />

          </>
        )}
      </button>

      {/* Hidden container for PDF rendering */}
      <div
        style={{
          position: "fixed",
          zIndex: -100,
          top: 0,
          left: "-2000px",
          pointerEvents: "none",
          background: "#fff"
        }}
      >
        <div
          ref={pdfRef}
          className="pdf-report"
          style={{
            width: "800px",
            padding: "40px",
          }}
        >
          <PDFProvider value={true}>
            <div className="flex flex-col text-left">
              {/* COVER PAGE ATOMS */}
              <div className="pdf-atomic py-20 px-10">
                <p className="text-brand-600 font-black text-xs uppercase tracking-[0.4em] mb-4">Automation Intelligence Report</p>
                <h1 className="text-4xl font-black text-gray-900 leading-[1.1] tracking-tight mb-4">
                  {process.title || "Process Analysis"}
                </h1>

              </div>

              <div className="pdf-atomic px-8 mb-8">
                <p className="text-lg text-gray-600 font-semibold whitespace-pre-line break-words">
                  {process.description}
                </p>
              </div>

              <div className="pdf-atomic px-10 mb-20">
                <div className="grid grid-cols-2 gap-12 w-full bg-gray-50 p-10 rounded-[40px] border border-gray-100">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3">Automation Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-7xl font-black text-brand-600">{process.automation_score}%</p>
                    </div>
                  </div>
                  <div className="border-l border-gray-200 pl-12 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3">Report Context</p>
                    <p className="text-xl font-bold text-gray-900 mb-1">System: {process.erp_system || "Enterprise"}</p>
                    <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* TABS - Already marked with pdf-atomic inside */}
              <OverviewTab insights={key_insights} topTargets={top_automation_targets} steps={steps} />
              <ERPContextTab erpModules={erp_modules} process={process} />
              <AutomationTab suggestions={suggestions} />
            </div>
          </PDFProvider>
        </div>
      </div>
    </>
  );
}
