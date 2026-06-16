import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ProcessHeader from '../components/analysis/ProcessHeader'
import OverviewTab from '../components/analysis/OverviewTab'
import ERPContextTab from '../components/analysis/ERPContextTab'
import AutomationTab from '../components/analysis/AutomationTab'
import ExportPDF from '../components/pdf/ExportPdf'
import SaveToWorkspaceButton from '../components/workspace/SaveToWorkspaceButton'
import { getProcess } from '../services/api'
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

export default function AnalysisPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [result, setResult] = useState(() => {
    // Priority 1: Check localStorage for updated/cached progress
    if (id) {
      const cached = localStorage.getItem(`analysis_${id}`);
      if (cached) return JSON.parse(cached);
    }
    // Priority 2: Fallback to location state (fresh from analysis)
    return location.state?.result || null;
  });

  const [loading, setLoading] = useState(!result)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const refetch = useCallback(async () => {
    setIsReanalyzing(true)
    try {
      const data = await getProcess(id)
      setResult(data)
      localStorage.setItem(`analysis_${id}`, JSON.stringify(data))
    } catch (err) {
      console.error("[AnalysisPage] refetch failed:", err)
      setError(err.message)
    } finally {
      setIsReanalyzing(false)
    }
  }, [id])

  useReanalyzeListener(id, {
    onReanalyzed: (detail) => {
      console.log("[AnalysisPage] onReanalyzed detail:", detail)
      // Start loader immediately AFTER re-analysis completes in chat section
      setIsReanalyzing(true)
      
      // Load for 3.5 seconds in background, then show new response
      setTimeout(() => {
        const freshAnalysisData = findAnalysisData(detail)
        console.log("[AnalysisPage] located freshAnalysisData:", freshAnalysisData)
        if (freshAnalysisData) {
          const newProcessKey = freshAnalysisData.process_key || freshAnalysisData.process?._key || detail.newProcessKey;
          setResult(freshAnalysisData);
          
          if (newProcessKey && newProcessKey !== id) {
            localStorage.setItem(`analysis_${newProcessKey}`, JSON.stringify(freshAnalysisData));
            
            try {
              const afxLastStr = localStorage.getItem('afx_last_analysis');
              const afxLast = afxLastStr ? JSON.parse(afxLastStr) : { user_input: "" };
              afxLast.session_id = newProcessKey;
              afxLast.analysis = freshAnalysisData;
              localStorage.setItem('afx_last_analysis', JSON.stringify(afxLast));
            } catch (err) {
              console.error("Failed to update afx_last_analysis:", err);
            }
            
            navigate(`/analysis/${newProcessKey}`, { replace: true });
          } else {
            localStorage.setItem(`analysis_${id}`, JSON.stringify(freshAnalysisData));
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
    const loadFromStorage = () => {
      const data = localStorage.getItem(`analysis_${id}`)
      if (data) {
        setResult(JSON.parse(data))
        return true
      }
      return false
    }

    if (!result && id) {
      const hasCached = loadFromStorage()
      if (!hasCached) {
        setLoading(true)
        getProcess(id)
          .then(data => {
            setResult(data)
            localStorage.setItem(`analysis_${id}`, JSON.stringify(data))
          })
          .catch(err => setError(err.message))
          .finally(() => setLoading(false))
      }
    } else if (result && id) {
      // Sync state back to storage to ensure persistence
      localStorage.setItem(`analysis_${id}`, JSON.stringify(result))
    }

    const handleStorage = (e) => {
      if (e.key === `analysis_${id}`) {
        loadFromStorage();
      }
    };

    window.addEventListener('automation-complete', loadFromStorage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('automation-complete', loadFromStorage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-brand-500" />
        <p className="text-white/40 text-sm">Loading analysis...</p>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-red-400 mb-4">{error || 'Process not found.'}</p>
        <button onClick={() => navigate('/')} className="btn-secondary">
          <ArrowLeft size={14} /> Back to Home
        </button>
      </div>
    )
  }

  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = result

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-1.5 text-sm text-white/40 font-bold
            hover:text-white transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> New Analysis
      </button>

      {/* Process header + tab switcher */}
      <ProcessHeader
        process={process}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={<>
          <ExportPDF data={result} />
          <SaveToWorkspaceButton
            analysis={result}
            sessionId={result?.process?.session_id || result?.session_id || id}
            userInput={location.state?.userInput || ''}
            defaultName={result?.process?.title || result?.process?.name || ''}
          />
        </>}
      />

      {/* Tab content */}
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
          <ERPContextTab erpModules={erp_modules} process={process} />
        )}
        {activeTab === 'automation' && (
          <AutomationTab suggestions={suggestions} />
        )}
      </div>
    </div>
  )
}
