import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import SwimlaneDiagram from '../automation/AgenticWorkflowDiagramNew';
import SapValidationWorkflow from '../automation/AgenticArchitectureNew';
import { PDFProvider } from "../../context/PdfContext";

export default function SuggestionExportPdf({ suggestion, processData }) {
  const [isExporting, setIsExporting] = useState(false);
  const printContainerRef = useRef();
  const printStyleRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
      document.body.classList.remove('suggestion-pdf-printing');
    };
  }, []);

  const handleDownload = useCallback(async () => {
    setIsExporting(true);

    try {
      // Inject print-specific stylesheet that hides everything except our print content
      const style = document.createElement('style');
      style.id = 'suggestion-pdf-print-styles';
      style.textContent = `
        @media print {
          /* Hide EVERYTHING on the page */
          body.suggestion-pdf-printing > * {
            display: none !important;
          }

          /* Show ONLY the print overlay */
          body.suggestion-pdf-printing > .suggestion-pdf-print-overlay {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            z-index: auto !important;
            pointer-events: auto !important;
            width: 100% !important;
          }

          body.suggestion-pdf-printing .pdf-print-inner {
            width: 100% !important;
            padding: 0 !important;
          }

          /* Ensure colors print correctly */
          body.suggestion-pdf-printing {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }

          /* Page settings */
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          /* Avoid breaks inside sections */
          body.suggestion-pdf-printing .pdf-print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 20px;
          }

          /* Force page break between major sections */
          body.suggestion-pdf-printing .pdf-print-page-break {
            page-break-before: always;
            break-before: always;
          }
        }
      `;
      document.head.appendChild(style);
      printStyleRef.current = style;

      // Mark body for print isolation
      document.body.classList.add('suggestion-pdf-printing');

      // Move the hidden print container to body level so the CSS selector works
      const printContainer = printContainerRef.current;
      const originalParent = printContainer.parentElement;
      const originalNextSibling = printContainer.nextSibling;
      document.body.appendChild(printContainer);
      printContainer.classList.add('suggestion-pdf-print-overlay');

      // Wait for diagrams to fully render (data fetch + layout)
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Listen for print completion
      const cleanup = () => {
        document.body.classList.remove('suggestion-pdf-printing');
        printContainer.classList.remove('suggestion-pdf-print-overlay');
        
        // Move container back to its original position
        if (originalNextSibling) {
          originalParent.insertBefore(printContainer, originalNextSibling);
        } else {
          originalParent.appendChild(printContainer);
        }

        // Remove print styles
        if (printStyleRef.current) {
          printStyleRef.current.remove();
          printStyleRef.current = null;
        }

        setIsExporting(false);
      };

      const afterPrintHandler = () => {
        window.removeEventListener('afterprint', afterPrintHandler);
        cleanup();
      };
      window.addEventListener('afterprint', afterPrintHandler);

      // Trigger native browser print (Chrome shows "Save as PDF")
      window.print();

      // Fallback cleanup if afterprint doesn't fire (some browsers)
      setTimeout(() => {
        if (isExporting) {
          window.removeEventListener('afterprint', afterPrintHandler);
          cleanup();
        }
      }, 60000);

    } catch (error) {
      console.error("PDF Export failed:", error);
      document.body.classList.remove('suggestion-pdf-printing');
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
      setIsExporting(false);
    }
  }, [isExporting]);

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
            <span className="text-black font-semibold text-sm">Preparing...</span>
          </>
        ) : (
          <>
            <Download size={18} className="text-black" />
          </>
        )}
      </button>

      {/* Hidden container — rendered off-screen, moved to body during print */}
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
            padding: "30px",
            background: "#ffffff",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <PDFProvider value={true}>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", color: "#111" }}>
              
              {/* HEADER SECTION */}
              <div className="pdf-print-section" style={{ marginBottom: 30 }}>
                <p style={{ color: "#10b981", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 12 }}>
                  Suggestion Report
                </p>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", lineHeight: 1.1, marginBottom: 12 }}>
                  {suggestion?.title || "Automation Suggestion"}
                </h1>
                <p style={{ fontSize: 15, color: "#6b7280", fontWeight: 600, marginBottom: 20 }}>
                  {suggestion?.description}
                </p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ background: "#f0fdf4", padding: "8px 16px", borderRadius: 8 }}>
                    <span style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", display: "block" }}>Automation Type</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>{suggestion?.agent_type?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                  <div style={{ background: "#f0fdf4", padding: "8px 16px", borderRadius: 8 }}>
                    <span style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", display: "block" }}>Complexity</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>{suggestion?.complexity || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* PROCESS WORKFLOW — fully zoomed out */}
              <div className="pdf-print-section pdf-print-page-break">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 16 }}>Process Workflow</h2>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "visible", background: "#fff" }}>
                  {suggestionId && <SwimlaneDiagram suggestionId={suggestionId} forPdf={true} />}
                </div>
              </div>

              {/* AGENT ARCHITECTURE — fully zoomed out */}
              <div className="pdf-print-section pdf-print-page-break">
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 16 }}>Agent Architecture</h2>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "visible", background: "#fff" }}>
                  {suggestionId && (
                    <SapValidationWorkflow 
                      suggestionId={suggestionId}
                      stepKey={suggestion?.step_key}
                      analysisId={analysisId}
                      forPdf={true}
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
