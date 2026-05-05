import clsx from 'clsx'
import { User, Monitor, GitBranch, CheckSquare, Bell } from 'lucide-react'

const STEP_TYPE_ICONS = {
  manual: User,
  system: Monitor,
  decision: GitBranch,
  approval: CheckSquare,
  notification: Bell,
}

const STEP_TYPE_COLORS = {
  manual: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  system: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  decision: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  approval: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  notification: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'higher agentic intervention': 'bg-red-500/10 text-red-500 border-red-500/20',
  'higher human intervention': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const getPotentialColor = (value) => {
  if (value >= 80) return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', bar: 'bg-red-500' };
  if (value > 10) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500' };
  return { bg: 'bg-brand-500/10', text: 'text-brand-500', border: 'border-brand-500/20', bar: 'bg-brand-500' };
};

function AutomationBar({ value, automation_reasoning, isBlocked }) {
  const colors = getPotentialColor(value);
  const color = colors.bar;
  return (
    <div className="group/bar relative mt-3">
      {automation_reasoning && !isBlocked && (
        <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 w-full rounded-bl-lg rounded-t-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-medium leading-tight text-black opacity-0 shadow-xl transition-all duration-300 translate-y-1 group-hover/bar:opacity-100 group-hover/bar:translate-y-0">
          {automation_reasoning}
        </div>
      )}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-white/40">Automation Potential</span>
        <span className={clsx('text-xs font-semibold', colors.text)}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function StepCard({ step, index, isLast, isSelected, onClick }) {
  const Icon = STEP_TYPE_ICONS[step.step_type?.toLowerCase()] || User
  const potentialColors = getPotentialColor(step.automation_potential);

  // Highlighting specific types and actors with potential-based colors as requested
  const isAgenticOrHuman = ['higher agentic intervention', 'higher human intervention'].includes(step.step_type?.toLowerCase());
  const isFinanceActor = step.actor?.toLowerCase().includes('finance') || step.actor?.toLowerCase().includes('manager');

  const isBlocked = step.automation_potential === 0;
  const typeColor = (isAgenticOrHuman || isFinanceActor)
    ? `${potentialColors.bg} ${potentialColors.text} ${potentialColors.border}`
    : (STEP_TYPE_COLORS[step.step_type?.toLowerCase()] || STEP_TYPE_COLORS.manual);

  return (
    <div className="shrink-0 w-full h-[240px]">
      {/* Card */}
      <div
        onClick={!isBlocked ? onClick : undefined}
        className={clsx(
          "card p-4 w-full h-full flex flex-col transition-all duration-200 animate-slide-up group",
          isSelected
            ? "bg-white/[0.08] ring-1 ring-brand-500/30"
            : !isBlocked && "hover:bg-white/[0.08] hover:ring-1 hover:ring-brand-500/30",
          isBlocked ? "cursor-not-allowed" : "cursor-pointer"
        )}
        style={{ animationDelay: `${index * 60}ms` }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wide shrink-0 whitespace-nowrap">
            Step {step.step_number}
          </span>
          <div
            className={clsx('agent-tag border flex items-center min-w-0', typeColor)}
            title={step.actor}
          >
            <Icon size={10} className="shrink-0 mr-1" />
            <span className="truncate">{step.actor}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white/90 text-sm leading-normal mb-2 group-hover:text-brand-400 transition-colors line-clamp-2">
          {step.title}
        </h3>
        <p className="text-xs text-white/50 leading-relaxed line-clamp-3 mb-auto">
          {step.description}
        </p>

        {/* Step type */}
        <div className="mt-auto">
          <div className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border', typeColor)}>
            <Icon size={10} />{step.step_type}
          </div>
        </div>

        <div className="mt-auto">
          <AutomationBar 
            value={step.automation_potential} 
            automation_reasoning={step.automation_reasoning} 
            isBlocked={isBlocked} 
          />
        </div>

        {/* Duration */}
        {step.duration_estimate && (
          <p className="mt-2 text-xs text-white/30">
            ⏱ {step.duration_estimate}
          </p>
        )}
      </div>
    </div>
  )
}


