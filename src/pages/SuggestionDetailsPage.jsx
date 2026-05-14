import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Cpu, CheckCircle2, ChevronDown, Workflow, Play, RefreshCw } from 'lucide-react'
import StepCard from '../components/analysis/StepCard'
import SuggestionCard from '../components/automation/SuggestionCard'
import AgenticDeploymentFlow from '../components/automation/AgenticArchitectureOld'
import SwimlaneDiagram from '../components/automation/AgenticWorkflowDiagramNew'
import { getProcessFlow } from '../services/api'
import SapValidationWorkflow from '../components/automation/AgenticArchitectureNew'
import SuggestionExportPdf from '../components/pdf/SuggestionExportPdf'


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

export default function SuggestionDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [suggestion, setSuggestion] = useState(null)
  const [processData, setProcessData] = useState(null)

  useEffect(() => {
    const loadData = () => {
      const data = localStorage.getItem(`suggestion_${id}`)
      if (data) {
        const parsed = JSON.parse(data)
        setSuggestion(parsed)

        // Read the cached analysis data from localStorage
        if (parsed.analysisId) {
          const analysisData = localStorage.getItem(`analysis_${parsed.analysisId}`)
          if (analysisData) {
            setProcessData(JSON.parse(analysisData))
          }
        }
      }
    }

    loadData()
    window.addEventListener('automation-complete', loadData)
    const handleStorage = (e) => {
      if (e.key === `suggestion_${id}` || (suggestion?.analysisId && e.key === `analysis_${suggestion.analysisId}`)) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('automation-complete', loadData)
      window.removeEventListener('storage', handleStorage)
    }
  }, [id, suggestion?.analysisId])

  if (!suggestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-white">
        <div className="text-center animate-pulse">
          <Cpu className="mx-auto mb-4 text-brand-500" size={48} />
          <h2 className="text-xl font-bold">Loading Suggestion Data...</h2>
          <p className="text-white/50">If this persists, the data might be lost.</p>
        </div>
      </div>
    )
  }

  const process = processData?.process
  const steps = processData?.steps || []
  // Find the step this suggestion belongs to
  const matchedStep = steps.find(s => s.id === suggestion.step_key)
  const matchedStepIndex = matchedStep ? steps.indexOf(matchedStep) : 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* ── Process Header Card ── */}
      {process && (
        <div
          className="card p-6 flex items-start justify-between gap-6 opacity-0 animate-slide-up"
          style={{ animationDelay: '0ms', animationFillMode: 'both' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-brand-500" />
              <span className="text-xs font-semibold text-brand-500 uppercase tracking-widest">
                Analysis Details
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {process.title}
            </h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
              {process.description}
            </p>
          </div>
          <div className="shrink-0 text-right flex flex-col items-end gap-4">
            <SuggestionExportPdf suggestion={suggestion} processData={processData} />
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
        className="rounded-3xl  backdrop-blur-sm shadow-2xl space-y-6 opacity-0 animate-slide-up"
        style={{ animationDelay: '150ms', animationFillMode: 'both' }}
      >
        {/* Selected Step Card */}
        {matchedStep && (
          <div
            className="[&>div]:w-full opacity-0 animate-slide-up"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
            <StepCard
              step={matchedStep}
              index={matchedStepIndex}
              isSelected={true}
              isLast={true}
            />
          </div>
        )}

        {/* Down arrow connector */}
        <div
          className="flex justify-center opacity-0 animate-fade-in"
          style={{ animationDelay: '500ms', animationFillMode: 'both' }}
        >
          <div className="flex flex-col items-center">
            <div className="w-px h-5 bg-white" />
            <ChevronDown size={19} className="text-white -mt-2" />
          </div>
        </div>

        {/* Suggestion Card */}
        <div
          className="grid grid-cols-1 gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
        >
          <SuggestionCard suggestion={suggestion} index={0} hideChip />
        </div>
        {/* Agentic Workflow Section */}
        {/* <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '800ms', animationFillMode: 'both' }}
        >
          <AgenticWorkflowCard suggestionId={id} />
        </div> */}

        {/* Architecture Card (Hardcoded) */}
        {/* <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '800ms', animationFillMode: 'both' }}
        >
          <DeploymentModelCard suggestion={suggestion} step={matchedStep} />
        </div> */}

        {/* Deployment Section (API-driven) */}
        {/* <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '1000ms', animationFillMode: 'both' }}
        >
          <AgentDeploymentCard suggestionId={id} />
        </div> */}

        <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '1200ms', animationFillMode: 'both' }}
        >
          <SwimlaneDiagramCard suggestionId={id} />
        </div>

        <div
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '1400ms', animationFillMode: 'both' }}
        >
          <AgenticArchitectureCard
            suggestionId={id}
            stepKey={suggestion.step_key}
            analysisId={suggestion.analysisId || processData?.process?._key || processData?.process?.id}
          />
        </div>


      </div>
    </div>
  )
}

function AgenticWorkflowCard({ suggestionId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Workflow size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">Agentic Process Workflow</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Operating Model: Agentic Operations</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        <SwimlaneDiagram suggestionId={suggestionId} />
      </div>
    </div>
  )
}

function AgentDeploymentCard({ suggestionId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Cpu size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">Agent  Deployment</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Operating Model: Infrastructure Layer</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        <AgenticDeploymentFlow suggestionId={suggestionId} />
      </div>

      <div className="flex justify-end mt-4 ">
        <button className="btn-primary shadow-xl shadow-brand-500/20 text-[10px] uppercase group">
          <Play size={14} className="fill-current group-hover:scale-110 transition-transform" />
          Run Deployment
        </button>
      </div>
    </div>
  )
}

function AgenticArchitectureCard({ suggestionId, stepKey, analysisId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Cpu size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">Agent  Architecture</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Operating Model: Workflow Automation</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        <SapValidationWorkflow
          suggestionId={suggestionId}
          stepKey={stepKey}
          analysisId={analysisId}
          onComplete={() => {
            // Re-sync from sessionStorage or trigger data refresh
            window.dispatchEvent(new Event('automation-complete'));
          }}
        />
      </div>
    </div>
  )
}

// function DeploymentModelCard({ suggestion, step }) {
//   // Static dummy data — contextual to the selected suggestion
//   // Replace with API data later
//   const erpModule = step?.erp_module || 'ERP Module'
//   const agentType = suggestion?.agent_type || 'workflow_automation'

//   const staticData = {
//     operatingModel: agentType === 'rpa' ? 'Robotic Process' : agentType === 'ai_agent' ? 'AI-Driven' : 'Workflow Automation',
//     architectureLayers: [
//       {
//         title: "User Interaction Layer",
//         description: `Dashboard interface for monitoring ${suggestion?.title || 'this automation'}. Provides real-time status indicators, manual override controls, and approval workflows for edge cases.`
//       },
//       {
//         title: "Agent Orchestration",
//         description: `Coordinates the ${agentType.replace('_', ' ')} agent lifecycle — handles task scheduling, parallel execution across ${erpModule} transactions, retry logic for failed operations, and inter-agent communication.`
//       },
//       {
//         title: `${erpModule} Integration`,
//         description: `Bi-directional connector to the ${erpModule} module. Manages data mapping for ${(step?.inputs || []).join(', ') || 'input data'}, transaction posting, master data synchronization, and real-time event triggers.`
//       },
//       {
//         title: "Governance / Observability",
//         description: `Full audit trail for every agent action within ${erpModule}. Includes compliance logging, performance dashboards, SLA tracking, and anomaly detection for ${(step?.pain_points || []).join('; ') || 'operational issues'}.`
//       }
//     ],
//     erpContext: [
//       {
//         title: "System Configuration",
//         description: `Module: ${erpModule} — API endpoints, authentication tokens, rate limits, and tenant-specific configurations. Maps ${(step?.inputs || []).join(', ') || 'inputs'} → ${(step?.outputs || []).join(', ') || 'outputs'}.`
//       },
//       {
//         title: "Connection Layer",
//         description: `Secure integration with ${erpModule} via OAuth2/certificate-based auth. Connection pooling optimized for ${step?.duration_estimate || 'standard'} execution windows with automatic failover.`
//       },
//       {
//         title: "Access & Security",
//         description: `Role-based access control for ${step?.actor || 'system'} operations. Data masking for sensitive fields, IP whitelisting, encryption at-rest/in-transit, and segregation of duties enforcement.`
//       }
//     ],
//     deploymentSteps: [
//       { id: 1, label: "Trigger", description: `${step?.actor || 'User'} initiates the automation or a scheduled event fires based on ${erpModule} conditions.` },
//       { id: 2, label: "Validate", description: `Agent validates ${(step?.inputs || ['input data']).join(', ')} against business rules and data quality checks.` },
//       { id: 3, label: "Execute", description: `${suggestion?.title || 'Automation task'} runs against ${erpModule}, processing transactions in real-time.` },
//       { id: 4, label: "Verify", description: `Automated checks confirm ${(step?.outputs || ['output']).join(', ')} accuracy — ${suggestion?.accuracy_estimate || 80}% target accuracy.` },
//       { id: 5, label: "Complete", description: `Results posted to ${erpModule}, audit logs written, and ${step?.actor || 'stakeholders'} notified of completion.` }
//     ]
//   };

//   return (
//     <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
//       <div className="flex items-center gap-3 mb-8">
//         <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
//           <Cpu size={20} className="text-brand-500" />
//         </div>
//         <div>
//           <h2 className="text-xl font-bold text-white/90">Agent Cluster Architecture</h2>
//           <p className="text-xs text-white/40">{erpModule} · {staticData.operatingModel} Agent</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
//         {/* Operating Model / Architecture Layers */}
//         <div className="bg-black/20 rounded-xl p-6 border border-white/5">
//           <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-widest mb-1">
//             Operating Model: {staticData.operatingModel}
//           </h3>
//           <p className="text-xs text-white/30 mb-5">Layered architecture for agent execution</p>
//           <div className="space-y-4">
//             {staticData.architectureLayers.map((layer, idx) => (
//               <div key={idx} className="flex gap-3">
//                 <div className="flex flex-col items-center pt-1">
//                   <span className="text-[10px] font-bold text-brand-500/60 bg-brand-500/10 w-6 h-6 rounded-md flex items-center justify-center">
//                     {(idx + 1).toString().padStart(2, '0')}
//                   </span>
//                   {idx < staticData.architectureLayers.length - 1 && (
//                     <div className="w-px flex-1 bg-white/10 mt-1" />
//                   )}
//                 </div>
//                 <div className="flex-1 pb-2">
//                   <p className="text-sm font-semibold text-white/90">{layer.title}</p>
//                   <p className="text-xs text-white/40 leading-relaxed mt-1">{layer.description}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ERP Context */}
//         <div className="bg-black/20 rounded-xl p-6 border border-white/5">
//           <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-1">
//             ERP Context
//           </h3>
//           <p className="text-xs text-white/30 mb-5">{erpModule} integration & security</p>
//           <div className="space-y-4">
//             {staticData.erpContext.map((item, idx) => (
//               <div key={idx} className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
//                 <div className="flex items-center gap-2 mb-2">
//                   <CheckCircle2 size={14} className="text-blue-500/60" />
//                   <p className="text-sm font-semibold text-white/90">{item.title}</p>
//                 </div>
//                 <p className="text-xs text-white/40 leading-relaxed pl-[22px]">{item.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }



function SwimlaneDiagramCard({ suggestionId }) {
  return (
    <div className="card p-8 border-brand-500/20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Workflow size={20} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 uppercase tracking-tight">Agentic Process Workflow</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Operating Model: Agentic Operations</p>
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

