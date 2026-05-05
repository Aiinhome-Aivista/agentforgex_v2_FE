import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { ChevronRight, ChevronLeft, TrendingUp, ArrowLeft, Zap, RefreshCw, Loader2 } from 'lucide-react'
import { usePDF } from '../../context/PdfContext'
import clsx from 'clsx'
import StepCard from './StepCard'
// import AutomationChart from '../charts/AutomationChart'
import SuggestionCard from '../automation/SuggestionCard'


const IMPACT_COLORS = {
  high: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-white/5 text-white/40 border-white/10',
}

const CATEGORY_ICONS = {
  automation: '⚡',
  bottleneck: '🔴',
  integration: '🔗',
  risk: '⚠️',
  opportunity: '✨',
}

function InsightCard({ insight }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10
        transition-all duration-150 border border-white/5 hover:border-white/10">
      <ChevronRight size={14} className="mt-0.5 shrink-0 text-brand-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 leading-relaxed">{insight.text}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs">{CATEGORY_ICONS[insight.category] || '•'}</span>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full border', IMPACT_COLORS[insight.impact])}>
            {insight.impact} impact
          </span>
        </div>
      </div>
    </div>
  )
}

function TopTarget({ item, rank }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-white/20 font-mono w-4">{rank}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">{item.title}</p>
          <p className="text-xs text-white/40">{item.actor}</p>
        </div>
      </div>
      <span className="text-sm font-bold text-brand-500 shrink-0 ml-4 tabular-nums">
        {item.automation_potential}%
      </span>
    </div>
  )
}

export default function OverviewTab({ insights, topTargets, steps, suggestions }) {
  const isPdf = usePDF()
  const scrollRef = useRef()
  const detailRef = useRef(null)
  const [selectedStep, setSelectedStep] = useState(null)
  const [displayStep, setDisplayStep] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 3500)
  }

  // Auto-scroll to detail section when a step is selected
  useEffect(() => {
    if (selectedStep && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [selectedStep]);

  // Auto-scroll to top on mount (Instant reset before paint)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })
  }

  const handleSelectStep = (step) => {
    setDisplayStep(step)
    setIsTransitioning(true)
    setTimeout(() => {
      setSelectedStep(step)
      setIsTransitioning(false)
    }, 50)
  }

  const handleBack = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setSelectedStep(null)
      setIsTransitioning(false)
      // Clear display step after animation completes
      setTimeout(() => setDisplayStep(null), 400)
    }, 50)
  }

  const activeStep = selectedStep || displayStep
  const stepSuggestions = activeStep
    ? (suggestions?.filter(s => s.step_key === activeStep.id) || [])
    : []

  if (isPdf) {
    return (
      <div className="pdf-section">
        <div className="mb-10">
          <h3 className="pdf-atomic text-lg font-bold text-gray-900 mb-6 border-b pb-2">Key Process Insights</h3>
          <div className="space-y-4">
            {insights?.map((insight, i) => (
              <div key={i} className="pdf-atomic flex gap-4 items-start pb-2">
                <span className="font-bold text-brand-600">0{i + 1}.</span>
                <div>
                  <p className="text-gray-900 font-medium">{insight.text}</p>
                  <p className="text-xs text-brand-600 font-bold uppercase mt-1">
                    {insight.category} · {insight.impact} impact
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="pdf-atomic text-lg font-bold text-gray-900 mb-6 border-b pb-2">Top Automation Targets</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border text-[10px] uppercase font-bold text-gray-500">Rank</th>
                <th className="p-2 border text-[10px] uppercase font-bold text-gray-500">Title / Process</th>
                <th className="p-2 border text-[10px] uppercase font-bold text-gray-500">Actor</th>
                <th className="p-2 border text-[10px] uppercase font-bold text-gray-500 text-right">Potential</th>
              </tr>
            </thead>
            <tbody>
              {topTargets?.map((t, i) => (
                <tr key={i} className="pdf-atomic">
                  <td className="p-2 border text-sm text-gray-400 font-mono">{i + 1}</td>
                  <td className="p-2 border text-sm font-bold text-gray-900">{t.title}</td>
                  <td className="p-2 border text-sm text-gray-600">{t.actor}</td>
                  <td className="p-2 border text-sm font-black text-brand-600 text-right">{t.automation_potential}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PDF: Step Breakdown */}
        <div className="pdf-section mt-10">
          <h3 className="pdf-atomic text-lg font-bold text-gray-900 mb-6 border-b pb-2">Process Step Breakdown</h3>
          <div className="space-y-4">
            {steps?.map((step, i) => (
              <div key={i} className="pdf-atomic flex gap-6 relative">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-3 z-10" />
                  {i < steps.length - 1 && (
                    <div className="w-px bg-gray-200 flex-1 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-6 pt-0">
                  <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-black text-gray-900 leading-tight">{step.title}</h4>
                      <span className="text-[10px] font-black uppercase text-white bg-brand-600 px-3 py-1 rounded-full">
                        {step.automation_potential}% POTENTIAL
                      </span>
                    </div>
                    <div className="flex gap-4 text-[10px] uppercase font-black text-gray-500 mb-3 tracking-widest">
                      <span className="text-brand-700">{step.actor}</span>
                      {step.step_type && (
                        <>
                          <span className="opacity-30">•</span>
                          <span>{step.step_type}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* <div className="pt-10 pdf-atomic">
            <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-2">Automation Potential Variance</h3>
            <div className="chart-container-pdf">
              <AutomationChart steps={steps} />
            </div>
          </div> */}
        </div>
      </div>
    )
  }

  const left = insights?.slice(0, Math.ceil(insights.length / 2)) || []
  const right = insights?.slice(Math.ceil(insights.length / 2)) || []

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Process Map section */}
      {steps?.length > 0 && (
        <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-2xl">
          <div className="transition-all duration-400 ease-out">
            <div className="">
              <div className="flex items-center gap-4">
                <h2 className="text-base font-semibold text-white/90">Process Mapping</h2>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 
                      transition-all duration-200 group flex items-center gap-2"
                  title="Refresh process mapping"
                >
                  <RefreshCw
                    size={14}
                    className={clsx(
                      "text-white/40 group-hover:text-white/80 transition-all",
                      isRefreshing && "animate-spin"
                    )}
                  />
                  {/* {isRefreshing && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Refreshing...
                    </span>
                  )} */}
                </button>
              </div>

              <div className="relative min-h-[400px]">
                {isRefreshing && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/10 backdrop-blur-md rounded-2xl animate-fade-in border border-white/5">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                      <p className="text-sm font-medium text-white/60">Loading process mapping...</p>
                    </div>
                  </div>
                )}

                <div className={clsx("flex flex-col gap-y-10 mt-8", isRefreshing && " bg-black/20 opacity-25 backdrop-blur-md transition-all duration-500")}>
                {(() => {
                  const chunkedSteps = [];
                  for (let i = 0; i < steps.length; i += 4) {
                    chunkedSteps.push(steps.slice(i, i + 4));
                  }

                  return chunkedSteps.map((chunk, rowIndex) => {
                    const isReversed = rowIndex % 2 !== 0;
                    const displaySteps = isReversed ? [...chunk].reverse() : chunk;

                    return (
                      <div key={rowIndex} className="relative">
                        <div className="grid grid-cols-4 gap-x-12 gap-y-16">
                          {displaySteps.map((step, i) => {
                            const isFirstInRow = i === 0;
                            const isLastInRow = i === displaySteps.length - 1;

                            
                            const showHorizontalArrow = isReversed ? i > 0 : i < displaySteps.length - 1;
                            const showVerticalArrow = (isReversed ? i === 0 : i === displaySteps.length - 1) && rowIndex < chunkedSteps.length - 1;

                            return (
                              <div
                                key={step.id || i}
                                className="relative group/step"
                                style={isReversed && i === 0 ? { gridColumnStart: 4 - chunk.length + 1 } : {}}
                              >
                                <StepCard
                                  step={step}
                                  index={rowIndex * 4 + i}
                                  isSelected={selectedStep?.id === step.id}
                                  isLast={step.id === steps[steps.length - 1].id}
                                  onClick={() => selectedStep?.id === step.id ? handleBack() : handleSelectStep(step)}
                                />

                                {/* Horizontal Arrow */}
                                {showHorizontalArrow && (
                                  <div className={clsx(
                                    "absolute top-1/2 -translate-y-1/2 z-10 flex items-center",
                                    isReversed ? "-left-10" : "-right-10"
                                  )}>
                                    {isReversed ? (
                                      <div className="flex items-center">
                                        <div className="w-0 h-0 border-t-4 border-b-4 border-r-4
                                            border-t-transparent border-b-transparent border-r-white" />
                                        <div className="w-6 h-px bg-white" />
                                      </div>
                                    ) : (
                                      <div className="flex items-center">
                                        <div className="w-6 h-px bg-white" />
                                        <div className="w-0 h-0 border-t-4 border-b-4 border-l-4
                                            border-t-transparent border-b-transparent border-l-white" />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Vertical Arrow */}
                                {showVerticalArrow && (
                                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                    <div className="w-px h-6 bg-white" />
                                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4
                                        border-l-transparent border-r-transparent border-t-white" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            </div>
          </div>

          {/* ── DETAIL VIEW (Expanding Suggestion Card) ── */}
          <div
            ref={detailRef}
            className={clsx(
              "grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              selectedStep
                ? "grid-rows-[1fr] opacity-100 mt-6"
                : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
            )}
          >
            <div className="overflow-hidden">
              {activeStep && (
                <div className="space-y-3 border-white/5">
                  {/* Breadcrumb + back */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1.5 text-xs font-bold text-white/40
                          hover:text-white transition-colors group"
                    >
                      <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                      Close
                    </button>
                    <span className="text-white/20">·</span>
                    <nav className="flex items-center gap-1.5 text-xs text-white/30">
                      <ChevronRight size={11} className="text-white/20" />
                      <span
                        className="hover:text-white/60 cursor-pointer transition-colors"
                      >
                        Agentic Suggestion
                      </span>
                      <ChevronRight size={11} className="text-white/20" />
                      <span className="text-brand-400 font-semibold truncate max-w-xs">
                        {activeStep.title}
                      </span>
                    </nav>
                  </div>

                  {/* Suggestions */}
                  {stepSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-4">
                        {stepSuggestions.map((s, i) => (
                          <SuggestionCard key={s.id || i} suggestion={s} index={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Zap size={28} className="text-white/10 mb-3" />
                      <p className="text-sm text-white/30">No automation suggestions for this step.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ALWAYS VISIBLE: Automation Potential Analysis ── */}
      {/* {steps?.length > 0 && (
        <div className="mt-4">
          <AutomationChart steps={steps} />
        </div>
      )} */}
      {/* Overview row: insights + top targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Insights — 2/3 width */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-white/90 mb-4">Key Process Insights</h2>
          {insights?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No insights available.</p>
          )}
        </div>

        {/* Top Automation Targets — 1/3 width */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-brand-500" />
            <h2 className="text-base font-semibold text-white/90">Top Automation Targets</h2>
          </div>
          <div className="card p-4">
            {topTargets?.length ? (
              topTargets.map((t, i) => <TopTarget key={i} item={t} rank={i + 1} />)
            ) : (
              <p className="text-sm text-white/40">No targets identified.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
