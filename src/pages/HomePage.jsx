import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSearch, Cpu, Lightbulb, Workflow, Layers } from 'lucide-react'
import FileUploader from '../components/upload/FileUploader'
import { analyzeFiles } from '../services/api'

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Deep Analysis',
    desc: 'Extract steps from complex documents',
    color: 'text-brand-500 bg-brand-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Agentic Suggestions',
    desc: 'AI-driven automation opportunities',
    color: 'text-yellow-500 bg-yellow-500/10',
  },
  {
    icon: Workflow,
    title: 'Agentic Operating Model',
    desc: 'Future State Human + AI workflow',
    color: 'text-blue-500 bg-blue-500/10',
  },
  {
    icon: Layers,
    title: 'Deployment Architecture',
    desc: 'Deployment modules for execution',
    color: 'text-purple-500 bg-purple-500/10',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async (files, userText = '') => {
    setError('')
    setLoading(true)
    try {
      const result = await analyzeFiles(files, userText)
      
      // Store session_id in localStorage
      if (result.session_id) {
        localStorage.setItem('session_id', result.session_id)
      }

      // Navigate to analysis page with result in state
      navigate(`/analysis/${result.process.id}`, { state: { result } })
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-white tracking-tight leading-tight">
          Let's <span className="gradient-text">Agentify</span> Your{' '}
          <span className="text-white">Process</span>
        </h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
          Upload your process documentation or ERP data dumps. Our AI will map your
          workflows and suggest agentic automations to boost productivity.
        </p>
      </div>

      {/* Uploader */}
      <FileUploader onAnalyze={handleAnalyze} loading={loading} />

      {error && (
        <div className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {FEATURES.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card p-5 space-y-3 hover:bg-white/10 transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white/90 text-sm">{title}</h3>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
