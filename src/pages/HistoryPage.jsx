import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, Loader2, FileText } from 'lucide-react'
import { listProcesses } from '../services/api'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listProcesses()
      .then(d => setProcesses(d.processes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-6 ml-1">
        <Clock size={18} className="text-brand-500" />
        <h1 className="text-xl font-bold text-white tracking-tight">Previous Analyses</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : processes.length === 0 ? (
        <div className="text-center py-24 text-white/20">
          <FileText size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-sm">No analyses yet. Upload a file to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {processes.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/analysis/${p.id}`)}
                className="card p-5 flex items-center justify-between cursor-pointer
                    hover:bg-white/[0.08] hover:scale-[1.01] transition-all duration-200"
              >
                <div>
                  <p className="font-bold text-white/90 group-hover:text-brand-400 transition-colors uppercase tracking-tight">{p.title}</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mt-1">
                    {p.source_type} · {new Date(p.created_at).toLocaleDateString()}
                    {p.erp_system && ` · ${p.erp_system}`}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-black text-brand-500 tabular-nums shadow-brand-500/20 drop-shadow-sm">
                    {p.automation_score}%
                  </span>
                  <ChevronRight size={18} className="text-white/10" />
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
