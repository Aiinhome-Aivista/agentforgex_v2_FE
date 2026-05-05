import clsx from 'clsx'
import { Upload, Search } from 'lucide-react'
import FileTag from './FileTag'
import WebSearchPanel from './WebSearchPanel'

export default function UploadDropzone({ tab, userInput, setUserInput, onDrop, onDragOver, onDragLeave, inputRef, dragging, addFiles }) {
  return (
    <div className="relative flex-1 flex flex-col">
      {tab === 'user' || tab === 'websearch' ? (
        <div key={tab} className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both">
          {tab === 'user' ? (
            <div className="w-full max-w-xl h-[220px] bg-white/[0.05] border border-white/20 rounded-2xl overflow-hidden focus-within:border-brand-500/50 focus-within:bg-white/[0.08] transition-all duration-300">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe your process in detail here."
                className="w-full h-full bg-transparent p-6 text-sm text-white placeholder:text-brand-500/60 outline-none font-medium resize-none leading-relaxed scrollbar-custom"
              />
            </div>
          ) : (
            <WebSearchPanel userInput={userInput} setUserInput={setUserInput} />
          )}
        </div>
      ) : (
        <div key="upload" className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both">
          <div
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-xl h-[220px] relative group cursor-pointer transition-all duration-500 flex flex-col outline-none"
          >
            <div className={clsx(
              'relative flex-1 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center transition-all duration-500',
              dragging ? 'border-brand-500 bg-brand-500/[0.08]' : 'border-white/20 bg-white/[0.05] hover:bg-white/[0.08]'
            )}>
              <input ref={inputRef} type="file" multiple accept={tab === 'erp' ? '.csv,.xlsx,.xls' : '.pdf,.docx,.doc,.txt'} className="hidden" onChange={e => addFiles(e.target.files)} />
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <Upload size={22} className="text-white/20 group-hover:text-brand-500 transition-colors" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">
                  {tab === 'erp' ? 'Upload ERP CSV / Excel Dumps' : 'Upload Process Documentation'}
                </p>
                <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto">
                  {tab === 'erp'
                    ? 'Drag and drop up to 20 CSV files from SAP, Oracle, etc.'
                    : 'PDF, DOCX, or TXT process definition documents'}
                </p>
              </div>
              <div className="flex gap-3 mt-4 text-xs text-white/20">
                {tab === 'erp'
                  ? ['CSV', 'XLSX', 'XLS'].map(t => <FileTag key={t} label={t} />)
                  : ['PDF', 'DOCX', 'TXT'].map(t => <FileTag key={t} label={t} />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
