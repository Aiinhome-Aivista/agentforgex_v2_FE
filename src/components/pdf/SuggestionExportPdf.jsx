import React, { useRef, useState, useEffect, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import SwimlaneDiagram from '../automation/AgenticWorkflowDiagramNew';
import SapValidationWorkflow from '../automation/AgenticArchitectureNew';
import { PDFProvider } from "../../context/PdfContext";

/* ═══════════════════════════════════════════════════════════
   HELPER — inline-style-only sub-components for the PDF
   (so the print engine renders everything correctly on a
   white background without needing Tailwind dark-mode hacks)
═══════════════════════════════════════════════════════════ */

function PdfStepCard({ step, index }) {
  if (!step) return null;
  const potentialColor = step.automation_potential >= 80 ? "#ef4444" : step.automation_potential > 10 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Step {step.step_number}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", padding: "2px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
          {step.actor}
        </span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>{step.title}</h3>
      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 12 }}>{step.description}</p>
      
      {/* Step type */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#6b7280", fontWeight: 600, textTransform: "capitalize", marginBottom: 12 }}>
        {step.step_type}
      </div>
      
      {/* Automation reasoning */}
      {step.automation_reasoning && (
        <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, marginBottom: 12, fontStyle: "italic", background: "#f9fafb", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${potentialColor}` }}>
          {step.automation_reasoning}
        </p>
      )}

      {/* Automation potential bar */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Automation Potential</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: potentialColor }}>{step.automation_potential}%</span>
        </div>
        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${step.automation_potential}%`, background: potentialColor, borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function PdfSuggestionCard({ suggestion }) {
  if (!suggestion) return null;
  const metrics = suggestion.metrics || {};
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff" }}>
      {/* Title & Description */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>{suggestion.title}</h3>
      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 }}>{suggestion.description}</p>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#10b981" }}>
          {suggestion.agent_type?.replace('_', ' ') || 'Workflow'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#6b7280" }}>
          {suggestion.effort_level} effort
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#6b7280" }}>
          {suggestion.execution_speed} execution
        </span>
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: "1px solid #f3f4f6", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Accuracy</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{suggestion.accuracy_estimate}%</p>
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>ROI Impact</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: suggestion.roi_impact === 'high' ? '#10b981' : suggestion.roi_impact === 'medium' ? '#f59e0b' : '#6b7280', textTransform: "capitalize" }}>{suggestion.roi_impact}</p>
        </div>
      </div>

      {/* Automation Potential */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f3f4f6", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Automation Potential</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#06b6d4" }}>
            Economic Value : {metrics.automation_potential || metrics.efficiency_potential || '65'}%
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          {metrics.outputs?.slice(0, 2).map((output, idx) => (
            <p key={idx} style={{ fontSize: 11, color: "#9ca3af" }}>~ {output}</p>
          ))}
        </div>
      </div>

      {/* Strategic Reason */}
      {metrics.reason && (
        <div style={{ paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>Strategic Reason</p>
          <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, fontStyle: "italic" }}>{metrics.reason}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
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
      // Inject print-specific stylesheet
      const style = document.createElement('style');
      style.id = 'suggestion-pdf-print-styles';
      style.textContent = `
        @media print {
          body.suggestion-pdf-printing > * {
            display: none !important;
          }
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
          body.suggestion-pdf-printing {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body.suggestion-pdf-printing .pdf-print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 20px;
          }
          body.suggestion-pdf-printing .pdf-print-page-break {
            page-break-before: always;
            break-before: always;
          }
        }
      `;
      document.head.appendChild(style);
      printStyleRef.current = style;

      // Mark body
      document.body.classList.add('suggestion-pdf-printing');

      // Move container to body level
      const printContainer = printContainerRef.current;
      const originalParent = printContainer.parentElement;
      const originalNextSibling = printContainer.nextSibling;
      document.body.appendChild(printContainer);
      printContainer.classList.add('suggestion-pdf-print-overlay');

      // Wait for diagrams to fetch data and render
      await new Promise(resolve => setTimeout(resolve, 4000));

      const cleanup = () => {
        document.body.classList.remove('suggestion-pdf-printing');
        printContainer.classList.remove('suggestion-pdf-print-overlay');
        if (originalNextSibling) {
          originalParent.insertBefore(printContainer, originalNextSibling);
        } else {
          originalParent.appendChild(printContainer);
        }
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

      window.print();

      // Fallback cleanup
      setTimeout(() => {
        window.removeEventListener('afterprint', afterPrintHandler);
        if (document.body.classList.contains('suggestion-pdf-printing')) {
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
  }, []);

  const suggestionId = suggestion?.id || suggestion?._key;
  const analysisId = suggestion?.analysisId || processData?.process?._key || processData?.process?.id;
  const process = processData?.process;
  const steps = processData?.steps || [];
  const matchedStep = steps.find(s => s.id === suggestion.step_key);

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
            padding: "30px",
            background: "#ffffff",
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "#111",
          }}
        >
          <PDFProvider value={true}>

            {/* ══════════════ SECTION 1: HEADER ══════════════ */}
            <div className="pdf-print-section" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#10b981", fontWeight: 900, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: 8 }}>
                    Suggestion Report
                  </p>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111", lineHeight: 1.15, marginBottom: 8 }}>
                    {process?.title || suggestion?.title || "Automation Suggestion"}
                  </h1>
                  <p style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, lineHeight: 1.6 }}>
                    {process?.description || suggestion?.description}
                  </p>
                </div>
                {process?.automation_score != null && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4 }}>
                      Automation Score
                    </p>
                    <p style={{ fontSize: 40, fontWeight: 900, color: "#10b981", lineHeight: 1 }}>
                      {process.automation_score}%
                    </p>
                    {process.erp_system && (
                      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>ERP: {process.erp_system}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ══════════════ SECTION 2: STEP DETAILS ══════════════ */}
            {matchedStep && (
              <div className="pdf-print-section" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 12, borderBottom: "2px solid #f3f4f6", paddingBottom: 8 }}>
                  Step Details
                </h2>
                <PdfStepCard step={matchedStep} />
              </div>
            )}

            {/* ══════════════ SECTION 3: SUGGESTION DETAILS ══════════════ */}
            <div className="pdf-print-section" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 12, borderBottom: "2px solid #f3f4f6", paddingBottom: 8 }}>
                Automation Suggestion
              </h2>
              <PdfSuggestionCard suggestion={suggestion} />
            </div>

            {/* ══════════════ SECTION 4: PROCESS WORKFLOW ══════════════ */}
            <div className="pdf-print-section pdf-print-page-break">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 12, borderBottom: "2px solid #f3f4f6", paddingBottom: 8 }}>
                Agentic Process Workflow
              </h2>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "visible", background: "#fff" }}>
                {suggestionId && <SwimlaneDiagram suggestionId={suggestionId} forPdf={true} />}
              </div>
            </div>

            {/* ══════════════ SECTION 5: AGENT ARCHITECTURE ══════════════ */}
            <div className="pdf-print-section pdf-print-page-break">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 12, borderBottom: "2px solid #f3f4f6", paddingBottom: 8 }}>
                Agent Architecture
              </h2>
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

          </PDFProvider>
        </div>
      </div>
    </>
  );
}
