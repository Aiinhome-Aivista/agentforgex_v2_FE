import clsx from 'clsx'
import { Cpu, Shield, Zap, ArrowRight, Lightbulb, Eye } from 'lucide-react'

const AGENT_TYPE_META = {
  system_integration: { label: 'System Integration', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  rpa: { label: 'RPA', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ai_agent: { label: 'AI Agent', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
  workflow_automation: { label: 'Workflow', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  communication_agent: { label: 'Comm Agent', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
}

const ROI_COLORS = {
  high: 'text-brand-500',
  medium: 'text-amber-500',
  low: 'text-white/40',
}

const EFFORT_COLORS = {
  low: 'bg-brand-500/10 text-brand-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
}

export default function SuggestionCard({ suggestion, index, hideChip }) {
  const meta = AGENT_TYPE_META[suggestion.agent_type] || AGENT_TYPE_META.workflow_automation

  const handleOpenStats = (e) => {
    e.stopPropagation()
    const id = suggestion.id || btoa(suggestion.title).substring(0, 10)
    // Extract the analysis ID from the current URL (e.g. /analysis/abc123)
    const pathParts = window.location.pathname.split('/')
    const analysisIdx = pathParts.indexOf('analysis')
    const analysisId = analysisIdx !== -1 ? pathParts[analysisIdx + 1] : null

    const details = {
      ...suggestion,
      analysisId,
      benefits: suggestion.benefits || [
        "Increases overall execution speed and operational efficiency",
        "Reduces manual effort significantly and frees up human resources",
        "Improves data accuracy, consistency and mitigates human errors",
        "Streamlines workflow handling with better compliance"
      ]
    }
    localStorage.setItem(`suggestion_${id}`, JSON.stringify(details))
    const url = `${import.meta.env.BASE_URL}suggestion/${id}`
    window.open(url, '_blank')
  }

  return (
    <div className="card p-5 hover:shadow-md transition-all duration-200 animate-slide-up relative"
      style={{ animationDelay: `${index * 80}ms` }}>

      {/* Top-right badge icon */}
      {!hideChip && (
        <div
          onClick={handleOpenStats}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-brand-500
            flex items-center justify-center shadow-lg shadow-brand-500/20 cursor-pointer hover:bg-brand-400 hover:scale-110 transition-all z-10"
          title="View Details"
        >
          <Lightbulb size={18} className="text-black" />
        </div>
      )}

      {/* Category label */}

      {/* Title */}
      <h3 className="font-bold text-white/90 text-base leading-snug pr-10 mb-2">
        {suggestion.title}
      </h3>
      <p className="text-sm text-white/60 leading-relaxed mb-4">
        {suggestion.description}
      </p>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={clsx('agent-tag border text-xs', meta.color)}>
          {meta.label}
        </span>
        <span className={clsx('agent-tag text-xs', EFFORT_COLORS[suggestion.effort_level])}>
          {suggestion.effort_level} effort
        </span>
        <span className="agent-tag bg-white/5 text-white/50 border border-white/5 text-xs">
          {suggestion.execution_speed} execution
        </span>
      </div>

      {/* Metrics */}
      <div className="flex justify-between gap-3 pt-3 border-t border-white/5">
        <Metric
          icon={<Shield size={13} className="text-brand-500" />}
          label="Accuracy"
          value={`${suggestion.accuracy_estimate}%`}
          bold
          tooltip={suggestion.accuracy_reason}
          onEyeClick={handleOpenStats}
        />
        <Metric
          icon={<Zap size={13} className="text-amber-500" />}
          label="ROI Impact"
          value={suggestion.roi_impact}
          valueClass={ROI_COLORS[suggestion.roi_impact]}
        />
      </div>

      {/* Efficiency Potential */}
      <div className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <ArrowRight size={12} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-white/50 tracking-tight leading-none mb-0.5">Automation Potential</p>
            <p className="text-sm font-bold text-cyan-400 tabular-nums">
              <span className='font-semibold'>Economic Value :</span>  {suggestion.metrics?.automation_potential || suggestion.metrics?.efficiency_potential || '65'}%
            </p>
          </div>
        </div>
        <div className="text-right">
          {suggestion.metrics?.outputs?.length > 0 &&
            suggestion.metrics.outputs.slice(0, 2).map((output, idx) => (
              <p key={idx} className="text-xs text-white/40 leading-tight truncate">
                ~ {output}
              </p>
            ))
          }
        </div>
      </div>

      {/* Strategic Reasoning */}
      {suggestion.metrics?.reason && (
        <div className="pt-2.5 mt-1 border-t border-white/5">
          <p className="text-xs uppercase font-bold text-white/30 tracking-widest mb-1 group-hover:text-cyan-400 Transition-all">
            Strategic Reason
          </p>
          <p className="text-xs text-white/50 leading-relaxed italic line-clamp-2 hover:line-clamp-none transition-all duration-300">
            {suggestion.metrics.reason}
          </p>
        </div>
      )}


      {/* Technologies */}
      {suggestion.technologies?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.technologies.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 bg-white/5 text-white/50 rounded-md font-mono border border-white/5">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ icon, label, value, bold, valueClass, tooltip, onEyeClick }) {
  return (
    <div className="group relative flex items-center gap-1.5 cursor-pointer">
      {label === 'Accuracy' && tooltip && (
        <div className="pointer-events-none  absolute top-0 left-20 z-10 w-24 md:w-[40rem] rounded-t-md rounded-br-md bg-slate-50  px-2.5 py-1 text-left text-[10px] leading-tight font-medium text-black opacity-0 shadow-lg transition-opacity duration-200  group-hover:opacity-100">
          {tooltip}

          {/* Arrow */}
          {/* <div className="absolute top-full right-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-200" /> */}
        </div>
      )}
      {icon}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[10px] uppercase font-semibold text-white/50 tracking-tight leading-none">{label}</p>
          {label === 'Accuracy' && (
            <Eye size={13} className="text-brand-500 group-hover:text-brand-400 transition-colors relative left-15 top-0" />
          )}
        </div>
        <p className={clsx(
          'text-sm font-semibold tabular-nums',
          valueClass || 'text-white/65',
          bold && 'text-brand-400'
        )}>
          {value}
        </p>
      </div>
    </div>
  )
}
