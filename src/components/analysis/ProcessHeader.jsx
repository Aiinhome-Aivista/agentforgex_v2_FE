import { useState, useEffect } from 'react'
import { CheckCircle2, QrCode } from 'lucide-react'
import clsx from 'clsx'

function AnimatedScore({ target }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!target) return
    const steps = 40
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, target)
      setDisplay(Math.round(current))
      if (current >= target) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [target])

  return (
    <span className="text-5xl font-black text-brand-500 tabular-nums leading-none">
      {display}%
    </span>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'erp', label: 'ERP Context' },
  /*   { id: 'automation', label: 'Automation' }, */
]

export default function ProcessHeader({ process, activeTab, onTabChange, actions }) {
  return (
    <div className="space-y-4">
      {/* Main card */}
      <div className="card p-6 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-brand-500" />
            <span className="text-xs font-semibold text-brand-500 uppercase tracking-widest">
              Analysis Complete
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {process.title}
          </h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
            {process.description}
          </p>
        </div>
        <div className="shrink-0 text-right">
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

      <div className="flex items-center justify-between gap-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx('tab-btn', activeTab === tab.id ? 'tab-active' : 'tab-inactive')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {actions && <div>{actions}</div>}
      </div>
    </div>
  )
}
