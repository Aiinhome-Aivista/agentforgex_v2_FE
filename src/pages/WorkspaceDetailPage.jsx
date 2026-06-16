import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Layers, Trash2, AlertCircle, Calendar,
} from 'lucide-react'
import { getWorkspace, deleteWorkspace } from '../services/workspaceApi'
import ProcessHeader from '../components/analysis/ProcessHeader'
import OverviewTab from '../components/analysis/OverviewTab'
import ERPContextTab from '../components/analysis/ERPContextTab'
import AutomationTab from '../components/analysis/AutomationTab'
import ExportPDF from '../components/pdf/ExportPdf'
import { useReanalyzeListener } from '../hooks/useReanalyzeListener'

const findAnalysisData = (obj) => {
  if (!obj || typeof obj !== 'object') return null
  if (obj.steps && obj.process) return obj
  if (obj.data) {
    const res = findAnalysisData(obj.data)
    if (res) return res
  }
  if (obj.process) {
    const res = findAnalysisData(obj.process)
    if (res) return res
  }
  return null
}

export default function WorkspaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [ws, setWs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const refetch = useCallback(async () => {
    setIsReanalyzing(true)
    try {
      const r = await getWorkspace(id)
      if (r?.status) {
        setWs(r.data)
        if (r.data?.analysis_data) {
          localStorage.setItem(`analysis_${id}`, JSON.stringify(r.data.analysis_data))
        }
        if (r.data?.process_key) {
          sessionStorage.setItem(`workspace_${id}_process_key`, r.data.process_key);
          window.dispatchEvent(new Event('workspace-process-key-updated'));
        }
      } else {
        setError(r?.message || 'Workspace not found')
      }
    } catch (e) {
      console.error("[WorkspaceDetailPage] refetch failed:", e)
      setError(e?.message || 'Could not load workspace')
    } finally {
      setIsReanalyzing(false)
    }
  }, [id])

  useReanalyzeListener(ws?.process_key || id, {
    onReanalyzed: (detail) => {
      console.log("[WorkspaceDetailPage] onReanalyzed detail:", detail)
      // Start loader immediately AFTER re-analysis completes in chat section
      setIsReanalyzing(true)
      
      // Load for 3.5 seconds in background, then show new response
      setTimeout(() => {
        const freshAnalysisData = findAnalysisData(detail)
        console.log("[WorkspaceDetailPage] located freshAnalysisData:", freshAnalysisData)
        if (freshAnalysisData) {
          const newProcessKey = freshAnalysisData.process_key || freshAnalysisData.process?._key || detail.newProcessKey;
          
          setWs((prev) => {
            if (!prev) return null
            return {
              ...prev,
              analysis_data: freshAnalysisData,
              ...(newProcessKey ? { process_key: newProcessKey } : {})
            }
          })
          localStorage.setItem(`analysis_${id}`, JSON.stringify(freshAnalysisData))
          
          if (newProcessKey) {
            sessionStorage.setItem(`workspace_${id}_process_key`, newProcessKey);
            window.dispatchEvent(new Event('workspace-process-key-updated'));
          }
        }
        setIsReanalyzing(false)
      }, 3500)
    },
    onFailed: () => {
      setIsReanalyzing(false)
    }
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    getWorkspace(id)
      .then((r) => {
        if (cancelled) return
        if (!r?.status) {
          setError(r?.message || 'Workspace not found')
          return
        }
        setWs(r.data)
        if (r.data?.analysis_data) {
          localStorage.setItem(`analysis_${id}`, JSON.stringify(r.data.analysis_data))
        }
        if (r.data?.process_key) {
          sessionStorage.setItem(`workspace_${id}_process_key`, r.data.process_key);
          window.dispatchEvent(new Event('workspace-process-key-updated'));
        }
      })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load workspace') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Listen for localStorage changes from other tabs (like Agent run completion)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `analysis_${id}`) {
        try {
          const freshData = JSON.parse(e.newValue);
          if (freshData) {
            setWs((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                analysis_data: freshData,
              };
            });
          }
        } catch (err) {
          console.error("Failed to parse storage update", err);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [id]);



  const handleDelete = async () => {
    setDeleting(true); setError('')
    try {
      const r = await deleteWorkspace(id)
      if (r?.status) {
        navigate('/workspaces', { replace: true })
      } else {
        setError(r?.message || 'Could not delete workspace')
      }
    } catch (e) {
      setError(e?.message || 'Could not delete workspace')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-brand-500" />
        <p className="text-white/40 text-sm">Loading workspace...</p>
      </div>
    )
  }

  if (error || !ws) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-red-400 mb-4">{error || 'Workspace not found.'}</p>
        <button
          onClick={() => navigate('/workspaces')}
          className="btn-secondary inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Workspaces
        </button>
      </div>
    )
  }

  const data = ws.analysis_data || {}
  const {
    process, steps, suggestions, erp_modules,
    key_insights, top_automation_targets,
  } = data

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/workspaces')}
          className="flex items-center gap-1.5 text-sm text-white/40 font-bold
                     hover:text-white transition-colors group"
        >
          <ArrowLeft size={14}
            className="group-hover:-translate-x-1 transition-transform" />
          Workspaces
        </button>

        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-[11px] uppercase font-bold tracking-widest
                           px-3 py-2 rounded text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] uppercase font-bold tracking-widest
                           px-3 py-2 rounded bg-red-500/80 hover:bg-red-500
                           text-white inline-flex items-center gap-1.5"
              >
                {deleting
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Trash2 size={12} />}
                Delete workspace
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-[11px] uppercase font-bold tracking-widest
                         px-3 py-2 rounded border border-white/10
                         bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/30
                         text-white/70 hover:text-red-300 inline-flex items-center
                         gap-1.5"
              title="Delete this workspace"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Workspace metadata card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-brand-500" />
              <p className="text-[10px] uppercase font-black tracking-widest
                            text-white/30">
                Workspace
              </p>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              {ws.name}
            </h1>
            {ws.user_input && (
              <p className="text-xs text-white/40 mt-2 italic">
                "{ws.user_input}"
              </p>
            )}
          </div>
          <div className="text-right text-[10px] uppercase font-black
                          tracking-widest text-white/30">
            <p className="inline-flex items-center gap-1">
              <Calendar size={10} />
              {new Date(ws.created_at).toLocaleString()}
            </p>
            {ws.session_id && (
              <p className="font-mono normal-case tracking-normal mt-1
                            text-white/20 text-[10px]">
                {String(ws.session_id).slice(0, 16)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* No analysis stored */}
      {!process ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-white/40">
            This workspace has no analysis attached.
          </p>
        </div>
      ) : (
        <>
          {/* Reuse the existing analysis components — same shape as AnalysisPage */}
          <ProcessHeader
            process={process}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            actions={<ExportPDF data={data} />}
          />

          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <OverviewTab
                insights={key_insights}
                topTargets={top_automation_targets}
                steps={steps}
                suggestions={suggestions}
                isReanalyzing={isReanalyzing}
              />
            )}
            {activeTab === 'erp' && (
              <ERPContextTab erpModules={erp_modules} />
            )}
            {activeTab === 'automation' && (
              <AutomationTab
                steps={steps}
                suggestions={suggestions}
              />
            )}
          </div>
        </>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10
                        px-3 py-2 text-xs text-red-300
                        flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
