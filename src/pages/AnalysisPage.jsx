import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ProcessHeader from '../components/analysis/ProcessHeader'
import OverviewTab from '../components/analysis/OverviewTab'
import ERPContextTab from '../components/analysis/ERPContextTab'
import AutomationTab from '../components/analysis/AutomationTab'
import ExportPDF from '../components/pdf/ExportPdf'
import SaveToWorkspaceButton from '../components/workspace/SaveToWorkspaceButton'
import { getProcess } from '../services/api'

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
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

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
