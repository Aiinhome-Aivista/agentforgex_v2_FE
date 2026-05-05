import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";
import SwimlaneDiagram from '../automation/AgenticWorkflowDiagramNew';
import SapValidationWorkflow from '../automation/AgenticArchitectureNew';
import { PDFProvider } from "../../context/PdfContext";

export default function SuggestionExportPdf({ suggestion, processData }) {
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef();

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

      // Wait for components to fully render and animate
      await new Promise(resolve => setTimeout(resolve, 3000));

      const atoms = element.querySelectorAll('.pdf-atomic');
      if (atoms.length === 0) return;

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

        if (!isFirstPage && (atomHeightMm > remainingSpaceMm - 10)) {
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

      pdf.save(`${suggestion?.title?.replace(/\s+/g, "_") || "Suggestion"}_Report.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const suggestionId = suggestion?.id || suggestion?._key;
  const analysisId = suggestion?.analysisId || processData?.process?._key || processData?.process?.id;

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isExporting}
        className="btn-primary px-4 py-2 h-10 shadow-lg shadow-brand-500/20 flex items-center gap-2"
        title="Export Suggestion to PDF"
      >
        {isExporting ? (
          <>
            <Loader2 size={18} className="animate-spin text-black" />
            <span className="text-black font-semibold text-sm">Exporting...</span>
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
              {/* HEADER */}
              <div className="pdf-atomic py-10 px-10">
                <p className="text-brand-600 font-black text-xs uppercase tracking-[0.4em] mb-4">Suggestion Report</p>
                <h1 className="text-4xl font-black text-gray-900 leading-[1.1] tracking-tight mb-4">
                  {suggestion?.title || "Automation Suggestion"}
                </h1>
                <p className="text-lg text-gray-600 font-semibold mb-6">
                  {suggestion?.description}
                </p>
                <div className="flex gap-4 mb-4">
                  <div className="bg-brand-50 px-4 py-2 rounded-lg">
                    <span className="text-xs text-brand-600 uppercase font-bold tracking-wider block">Automation Type</span>
                    <span className="text-lg font-black text-gray-900">{suggestion?.agent_type?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                  <div className="bg-brand-50 px-4 py-2 rounded-lg">
                    <span className="text-xs text-brand-600 uppercase font-bold tracking-wider block">Complexity</span>
                    <span className="text-lg font-black text-gray-900">{suggestion?.complexity || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* GRAPH 1 */}
              <div className="pdf-atomic px-10 mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Process Workflow</h2>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {suggestionId && <SwimlaneDiagram suggestionId={suggestionId} />}
                </div>
              </div>

              {/* GRAPH 2 */}
              <div className="pdf-atomic px-10 mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Architecture</h2>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  {suggestionId && (
                    <SapValidationWorkflow 
                      suggestionId={suggestionId}
                      stepKey={suggestion?.step_key}
                      analysisId={analysisId}
                    />
                  )}
                </div>
              </div>

            </div>
          </PDFProvider>
        </div>
      </div>
    </>
  );
}
