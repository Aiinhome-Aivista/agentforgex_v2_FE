import { X, Search } from 'lucide-react'
import { LABELS, getExt } from './constants'

export default function FileList({ files, removeFile, tab, userInput = '', removeText }) {
  if (files.length === 0 && !userInput.trim()) return null;
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
      {files.map(f => (
        <div key={f.name} className="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className="text-[10px] font-black px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-md shrink-0">{(LABELS[getExt(f.name)] || 'FILE').toUpperCase()}</span>
            <span className="text-sm font-bold text-white/80 truncate">{f.name}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); removeFile(f.name); }} 
            className="text-white/10 hover:text-red-500 transition-colors shrink-0 ml-4"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      {userInput.trim() && (
        <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
              tab === 'websearch'
                ? 'bg-brand-500/20 text-brand-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {tab === 'websearch' ? 'SEARCH' : 'TEXT'}
            </span>
            <span className="text-sm font-bold text-white/80 truncate">{userInput}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); removeText(); }} 
            className="text-white/10 hover:text-red-500 transition-colors shrink-0 ml-4"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
