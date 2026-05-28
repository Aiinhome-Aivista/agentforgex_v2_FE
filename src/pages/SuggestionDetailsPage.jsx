/**
 * SuggestionDetailsPage.jsx
 * Page that shows process analysis details and the export button.
 * Export logic has been extracted to SuggestionExportPdf + generator utils.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Cpu, CheckCircle2, ChevronDown, Workflow, Play } from "lucide-react";
import StepCard from "../components/analysis/StepCard";
import SuggestionCard from "../components/automation/SuggestionCard";
import AgenticDeploymentFlow from "../components/automation/AgenticArchitectureOld";
import SwimlaneDiagram from "../components/automation/AgenticWorkflowDiagramNew";
import SapValidationWorkflow from "../components/automation/AgenticArchitectureNew";
import SuggestionExportPdf from "../components/pdf/SuggestionExportPdf";
import { getProcessFlow } from "../services/api";

// ─── Animated score counter ───────────────────────────────────────────────────

function AnimatedScore({ target }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!target) return;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplay(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="text-5xl font-black text-brand-500 tabular-nums leading-none">
      {display}%
    </span>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function SuggestionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState(null);
  const [processData, setProcessData] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load data from localStorage (existing pattern)
  useEffect(() => {
    const loadData = () => {
      const raw = localStorage.getItem(`suggestion_${id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSuggestion(parsed);

      if (parsed.analysisId) {
        const analysis = localStorage.getItem(`analysis_${parsed.analysisId}`);
        if (analysis) setProcessData(JSON.parse(analysis));
      }
    };

    loadData();
    window.addEventListener("automation-complete", loadData);

    const handleStorage = (e) => {
      if (
        e.key === `suggestion_${id}` ||
        (suggestion?.analysisId && e.key === `analysis_${suggestion.analysisId}`)
      ) {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("automation-complete", loadData);
      window.removeEventListener("storage", handleStorage);
    };
  }, [id, suggestion?.analysisId]);

  // Loading state
  if (!suggestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white">
        <div className="text-center animate-pulse">
          <Cpu className="mx-auto mb-4 text-brand-500" size={48} />
          <h2 className="text-xl font-bold">Loading Suggestion Data...</h2>
          <p className="text-white/50 text-sm mt-1">
            If this persists, the data may have been cleared.
          </p>
        </div>
      </div>
    );
  }

  const process = processData?.process;
  const steps = processData?.steps || [];
  const matchedStep = steps.find((s) => s.id === suggestion.step_key);
  const matchedStepIndex = matchedStep ? steps.indexOf(matchedStep) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* ── Process Header ── */}
      {process && (
        <div
          className={`card p-6 flex items-start justify-between gap-6 opacity-0 animate-slide-up relative ${
            isDropdownOpen ? "z-30" : "z-10"
          }`}
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-brand-500" />
              <span className="text-xs font-semibold text-brand-500 uppercase tracking-widest">
                Analysis Details
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{process.title}</h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
              {process.description}
            </p>
          </div>
 
          <div className="shrink-0 text-right flex flex-col items-end gap-4">
            {/* ── Export button ── */}
            <SuggestionExportPdf
              suggestion={suggestion}
              processData={processData}
              onDropdownOpenChange={setIsDropdownOpen}
            />

            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                Automation Score
              </p>
              <div className="flex items-center gap-2 justify-end">
                <AnimatedScore target={process.automation_score} />
              </div>
              {process.erp_system && (
                <p className="text-xs text-white/40 mt-1">ERP: {process.erp_system}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step Card + Suggestion ── */}
      <div
        className="rounded-3xl backdrop-blur-sm shadow-2xl space-y-6 opacity-0 animate-slide-up relative z-20"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        {/* Selected step */}
        {matchedStep && (
          <div
            className="[&>div]:w-full opacity-0 animate-slide-up"
            style={{ animationDelay: "300ms", animationFillMode: "both" }}
          >
            <StepCard
              step={matchedStep}
              index={matchedStepIndex}
              isSelected
              isLast
            />
          </div>
        )}

        {/* Connector arrow */}
        <div
          className="flex justify-center opacity-0 animate-fade-in"
          style={{ animationDelay: "500ms", animationFillMode: "both" }}
        >
          <div className="flex flex-col items-center">
            <div className="w-px h-5 bg-white" />
            <ChevronDown size={19} className="text-white -mt-2" />
          </div>
        </div>

        {/* Suggestion card */}
        <div
          className="grid grid-cols-1 gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: "600ms", animationFillMode: "both" }}
        >
          <SuggestionCard suggestion={suggestion} index={0} hideChip />
        </div>

        {/* Agentic Process Workflow diagram */}
        <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: "1200ms", animationFillMode: "both" }}
        >
          <SwimlaneDiagramCard suggestionId={id} />
        </div>

        {/* Agent Architecture */}
        <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: "1400ms", animationFillMode: "both" }}
        >
          <AgenticArchitectureCard
            suggestionId={id}
            stepKey={suggestion.step_key}
            analysisId={suggestion.analysisId || processData?.process?._key || processData?.process?.id}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Inner card components ────────────────────────────────────────────────────

function SwimlaneDiagramCard({ suggestionId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Workflow size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">
            Agentic Process Workflow
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
            Operating Model: Agentic Operations
          </p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        {!suggestionId ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-white/30 text-sm animate-pulse">Initializing Diagram...</p>
          </div>
        ) : (
          <SwimlaneDiagram suggestionId={suggestionId} />
        )}
      </div>
    </div>
  );
}

function AgenticArchitectureCard({ suggestionId, stepKey, analysisId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Cpu size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">
            Agent Architecture
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
            Operating Model: Workflow Automation
          </p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        <SapValidationWorkflow
          suggestionId={suggestionId}
          stepKey={stepKey}
          analysisId={analysisId}
          onComplete={() => window.dispatchEvent(new Event("automation-complete"))}
        />
      </div>
    </div>
  );
}
