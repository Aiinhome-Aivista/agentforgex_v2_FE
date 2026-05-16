/**
 * PdfTemplate.jsx
 * 
 * NOTE: This component is now a lightweight PREVIEW panel only.
 * The actual PDF/DOCX/PPTX export is handled by the native generators in:
 *   src/utils/pdfGenerator.js   (jsPDF native — no html2canvas)
 *   src/utils/docxGenerator.js  (docx library — programmatic)
 *   src/utils/pptxGenerator.js  (pptxgenjs — shapes/text only)
 *
 * This preview renders a condensed visual summary of the technical design
 * without any dependency on html2canvas or PNG capture.
 */

import React, { useMemo } from "react";
import { Zap, Shield, Cpu, Database, Workflow, CheckCircle2, TrendingUp } from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high:     "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const WORKFLOW_STAGES = [
  { icon: "📥", label: "Input\nCollection",   color: "from-blue-500 to-blue-700" },
  { icon: "⚙️", label: "Data\nProcessing",    color: "from-violet-500 to-violet-700" },
  { icon: "🧠", label: "AI\nAnalysis",         color: "from-emerald-500 to-emerald-700" },
  { icon: "🤝", label: "Multi-Agent\nCollab",  color: "from-pink-500 to-pink-700" },
  { icon: "✅", label: "Validation",            color: "from-amber-500 to-amber-700" },
  { icon: "📄", label: "Design\nGen",           color: "from-sky-500 to-sky-700" },
  { icon: "🚀", label: "Final\nOutput",         color: "from-emerald-500 to-teal-700" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand-500 shrink-0" />}
        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetricBadge({ metric, target }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-tight">
        {metric}
      </p>
      <p className="text-base font-black text-brand-500 leading-none">{target}</p>
    </div>
  );
}

function AgentCard({ agent }) {
  return (
    <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="w-7 h-7 rounded-md bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-black text-brand-500">{agent.agent_id}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white/90 truncate">{agent.name}</p>
        <p className="text-[10px] text-brand-500 truncate">{agent.role}</p>
        {agent.reasoning_framework && (
          <span className="inline-block mt-1 px-1.5 py-0.5 bg-white/10 rounded text-[8px] font-bold text-white/40 uppercase tracking-wider">
            {agent.reasoning_framework}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Workflow visual ──────────────────────────────────────────────────────────

function WorkflowDiagram() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
      {WORKFLOW_STAGES.map((stage, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center shrink-0 w-16">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg mb-1.5`}>
              <span className="text-lg">{stage.icon}</span>
            </div>
            <span className="text-[8px] font-bold text-white/60 text-center leading-tight whitespace-pre-wrap">
              {stage.label}
            </span>
          </div>
          {i < WORKFLOW_STAGES.length - 1 && (
            <div className="w-6 shrink-0 flex items-center justify-center -mt-4">
              <svg viewBox="0 0 24 8" className="w-full" fill="none">
                <path d="M0 4 H20 M16 1 L20 4 L16 7" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PdfTemplate({ data, suggestionTitle }) {
  if (!data) return null;

  const docMeta  = data.cover_page || data.document_metadata || {};
  const sections = data.sections || [];

  // Extract key data slices
  const agents = useMemo(() => {
    const layer3 = sections
      .find(s => s.architecture_layers)
      ?.architecture_layers?.find(l => l.agents);
    return layer3?.agents || [];
  }, [sections]);

  const metrics = useMemo(() =>
    sections.find(s => s.metrics)?.metrics || [],
  [sections]);

  const guardrails = useMemo(() =>
    sections.find(s => s.guardrails)?.guardrails || [],
  [sections]);

  const stack = useMemo(() =>
    sections.find(s => s.stack)?.stack || {},
  [sections]);

  return (
    <div className="space-y-4 p-4 text-left">

      {/* ── Cover info ── */}
      <div className="bg-gradient-to-br from-brand-500/20 to-brand-500/5 border border-brand-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black fill-black" />
          </div>
          <span className="text-xs font-black text-brand-500 uppercase tracking-widest">AgentForgeX</span>
          <span className="ml-auto px-2 py-0.5 border border-brand-500/30 rounded-full text-[8px] font-bold text-brand-500 uppercase tracking-widest">
            Confidential
          </span>
        </div>
        <p className="text-[9px] font-bold text-brand-500/70 uppercase tracking-widest mb-1.5">
          {docMeta.document_type || "Technical Design Document"}
        </p>
        <h2 className="text-lg font-black text-white leading-tight mb-2">
          {suggestionTitle || docMeta.title}
        </h2>
        {docMeta.subtitle && (
          <p className="text-xs text-white/50">{docMeta.subtitle}</p>
        )}
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
          {[["Date", docMeta.date], ["Version", docMeta.version], ["Org", docMeta.organization]].map(([l, v]) => (
            v && (
              <div key={l}>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{l}</p>
                <p className="text-xs font-bold text-white/80">{v}</p>
              </div>
            )
          ))}
        </div>
      </div>

      {/* ── Agentic Workflow ── */}
      <SectionCard icon={Workflow} title="Agentic Process Workflow">
        <WorkflowDiagram />
        <p className="text-[9px] text-white/30 text-center">
          Operating Model: Hierarchical Orchestrator  •  Plan-and-Execute + ReAct
        </p>
      </SectionCard>

      {/* ── Agents ── */}
      {agents.length > 0 && (
        <SectionCard icon={Cpu} title={`AI Agents (${agents.length})`}>
          <div className="grid grid-cols-1 gap-2">
            {agents.map((a) => <AgentCard key={a.agent_id} agent={a} />)}
          </div>
        </SectionCard>
      )}

      {/* ── Metrics ── */}
      {metrics.length > 0 && (
        <SectionCard icon={TrendingUp} title="Success Metrics">
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m, i) => <MetricBadge key={i} metric={m.metric} target={m.target} />)}
          </div>
        </SectionCard>
      )}

      {/* ── Guardrails ── */}
      {guardrails.length > 0 && (
        <SectionCard icon={Shield} title="Guardrails">
          <div className="space-y-2">
            {guardrails.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-white/80">{r.rail_type}</span>
                  {r.functions?.[0] && (
                    <p className="text-[9px] text-white/40 mt-0.5 truncate">{r.functions[0]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Tech Stack ── */}
      {Object.keys(stack).length > 0 && (
        <SectionCard icon={Database} title="Tech Stack">
          <div className="space-y-1.5">
            {Object.entries(stack).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider shrink-0 w-24 truncate">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-[9px] text-white/60 truncate">
                  {Array.isArray(v) ? v.slice(0, 3).join("  •  ") : String(v)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Export note ── */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
        <p className="text-[9px] text-white/20 uppercase tracking-widest">
          Exported via AgentForgeX native generators · PDF / DOCX / PPTX
        </p>
      </div>

    </div>
  );
}
