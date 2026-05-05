export default function FileTag({ label }) {
  return (
    <span className="px-2.5 py-1 bg-white/[0.03] border border-white/10 rounded-lg font-black text-[9px] tracking-[0.1em] uppercase text-white/40 group-hover:border-brand-500/20 group-hover:text-brand-400 transition-colors duration-500">
      {label}
    </span>
  )
}
