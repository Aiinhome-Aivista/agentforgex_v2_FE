import { Database, GitFork } from 'lucide-react'
import { usePDF } from '../../context/PdfContext'

function ModuleCard({ mod }) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-brand-500 uppercase tracking-widest">
          {mod.module_name}
        </span>
        <span className="text-xs text-white/40 font-mono shrink-0">
          {mod.source_file}
        </span>
      </div>
      <p className="text-sm text-white/60 mb-3">{mod.description}</p>

      {mod.tables_identified?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-white/40 mb-1.5">Tables / Entities</p>
          <div className="flex flex-wrap gap-1.5">
            {mod.tables_identified.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400
                  rounded-md font-mono border border-blue-500/20">{t}</span>
            ))}
          </div>
        </div>
      )}

      {mod.fields_identified?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-white/40 mb-1.5">Fields Identified</p>
          <div className="flex flex-wrap gap-1.5">
            {mod.fields_identified.slice(0, 12).map(f => (
              <span key={f} className="text-xs px-2 py-0.5 bg-white/5 text-white/50
                  rounded-md font-mono border border-white/5">{f}</span>
            ))}
            {mod.fields_identified.length > 12 && (
              <span className="text-xs text-white/30">
                +{mod.fields_identified.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ERPContextTab({ erpModules, process }) {
  const isPdf = usePDF()
  const hasModules = erpModules?.length > 0

  if (isPdf) {
    return (
      <div className="pdf-section">
        <h3 className="pdf-atomic text-lg font-bold text-gray-900 mb-6 border-b pb-2">System & Module Inventory</h3>
        {hasModules ? (
          <div className="flex flex-col">
            {erpModules.map((mod, i) => (
              <div key={i} className="mb-8 pl-4 border-l-4 border-brand-500">
                {/* Header Atom */}
                <div className="pdf-atomic mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-base font-black text-gray-900 uppercase">{mod.module_name}</h4>
                    <span className="text-[10px] font-mono text-gray-400 uppercase">{mod.source_file}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{mod.description}</p>
                </div>

                {/* Entities Atom */}
                <div className="pdf-atomic mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entities Identified</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {mod.tables_identified?.join(', ') || 'None identified'}
                  </p>
                </div>

                {/* Fields Atom */}
                <div className="pdf-atomic bg-white p-3 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Key Technical Fields</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {mod.fields_identified?.slice(0, 20).join(', ') || 'None identified'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pdf-atomic text-sm text-gray-400 italic">No ERP modules were identified during analysis.</p>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Module Identification */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-brand-500" />
          <h2 className="text-base font-semibold text-white/90">Module Identification</h2>
        </div>
        <div>
          {hasModules ? (
            <div className="space-y-3">
              {erpModules.map((mod, i) => <ModuleCard key={i} mod={mod} />)}
            </div>
          ) : (
            <div className="card p-6 text-center flex flex-col justify-center">
              <Database size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/40">
                No ERP modules identified in the uploaded files.
              </p>
              <p className="text-xs text-white/20 mt-1">
                Upload ERP data dumps for module-level analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Logical Relationships */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <GitFork size={16} className="text-brand-500" />
          <h2 className="text-base font-semibold text-white/90">Logical Relationships</h2>
        </div>
        <div>
          {hasModules ? (
            <div className="card p-5 space-y-3">
              {erpModules.map((mod, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-brand-500/40 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/80">{mod.module_name}</p>
                    <p className="text-xs text-white/30">{mod.erp_system} · {mod.description?.slice(0, 80)}...</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center flex flex-col justify-center">
              <GitFork size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/40">
                Logical relationships will appear here once ERP modules are identified.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
