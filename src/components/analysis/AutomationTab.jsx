import SuggestionCard from '../automation/SuggestionCard'
import { Zap } from 'lucide-react'
import { usePDF } from '../../context/PdfContext'

export default function AutomationTab({ suggestions }) {
  const isPdf = usePDF()

  if (isPdf) {
    return (
      <div className="pdf-section">
        <h3 className="pdf-atomic text-lg font-bold text-gray-900 mb-6 border-b pb-2">
          {suggestions?.length} Automation Opportunities Identified
        </h3>
        <div className="space-y-10">
          {suggestions?.map((s, i) => (
            <div key={i} className="pdf-atomic relative pl-6 border-l-2 border-gray-100 pb-2 mb-8">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-brand-500" />
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-base font-bold text-gray-900 leading-tight pr-20">{s.title}</h4>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-black uppercase text-gray-500 shrink-0">
                  {s.agent_type?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">{s.description}</p>
              <div className="grid grid-cols-3 gap-6 py-3 border-t border-b border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ROI Impact</p>
                  <p className="text-sm font-bold text-brand-600">{s.roi_impact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Effort Level</p>
                  <p className="text-sm font-bold text-amber-600">{s.effort_level}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accuracy Est.</p>
                  <p className="text-sm font-bold text-gray-900">{s.accuracy_estimate}%</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stack / Tech</p>
                <p className="text-xs font-mono text-gray-500 truncate">{s.technologies?.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!suggestions?.length) {
    return (
      <div className="animate-fade-in text-center py-16">
        <Zap size={32} className="text-white/10 mx-auto mb-3" />
        <p className="text-white/40">No automation suggestions generated yet.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-brand-500" fill="currentColor" />
          <h2 className="text-base font-semibold text-white/90">
            {suggestions.length} Automation Opportunities
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
            AI Agent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            System Integration
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            RPA
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((s, i) => (
          <SuggestionCard key={s.id || i} suggestion={s} index={i} />
        ))}
      </div>
    </div>
  )
}
