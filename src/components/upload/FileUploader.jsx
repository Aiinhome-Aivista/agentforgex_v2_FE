import { useState, useRef, useCallback } from 'react'
import { Upload, AlertCircle, Loader2, Plus } from 'lucide-react'
import clsx from 'clsx'

import { LABELS, getExt } from './constants'
import FileTag from './FileTag'
import UploadSidebar from './UploadSidebar'
import UploadDropzone from './UploadDropzone'
import FileList from './FileList'

export default function FileUploader({ onAnalyze, loading }) {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(null) // null | 'docs' | 'erp' | 'user' | 'websearch'
  const [userInput, setUserInput] = useState('')
  const inputRef = useRef()

  const addFiles = useCallback((incoming) => {
    setError('')
    const arr = Array.from(incoming)
    const valid = arr.filter(f => {
      const ext = getExt(f.name)
      if (!LABELS[ext]) return false;
      if (tab === 'erp') return ['csv', 'xlsx', 'xls'].includes(ext);
      if (tab === 'docs') return ['pdf', 'docx', 'doc', 'txt'].includes(ext);
      if (tab === 'websearch') return false; // websearch doesn't accept files
      return false;
    })
    if (valid.length !== arr.length && tab !== 'websearch') setError('Some files were skipped (unsupported type).')
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))].slice(0, 20)
    })
  }, [tab])

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const removeFile = (name) => setFiles(f => f.filter(x => x.name !== name))

  const handleSubmit = () => {
    if (files.length === 0 && (!userInput || userInput.trim() === '')) {
      setError('Please provide input for the selected mode.');
      return;
    }
    onAnalyze(files, userInput)
  }

  return (
    <div className={clsx(
      "w-full mx-auto space-y-8 transition-all duration-700 ease-in-out",
      tab === null ? "max-w-7xl" : "max-w-7xl"
    )}>
      {/* Initial Upload Button Toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            if (tab === null) {
              setTab('docs');
            } else {
              setTab(null);
              setFiles([]);
              setUserInput('');
            }
          }}
          className={clsx(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight',
            'bg-brand-500 text-black shadow-lg shadow-brand-500/20 hover:bg-brand-400'
          )}
        >
          <Plus size={16} />
          <span>Add Data Source</span>
        </button>
      </div>

      <div
        className={clsx(
          "flex transition-all duration-700 ease-in-out overflow-hidden shadow-2xl",
          tab === null
            ? "w-full border-2 border-dashed border-white/20 bg-white/10 rounded-2xl min-h-[250px]  cursor-pointer hover:border-brand-500/50 hover:bg-white/[0.08]"
            : "relative bg-[#0d0d0d]/40 backdrop-blur-3xl border border-white/20 rounded-3xl min-h-[350px] shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]"
        )}
      >
        {tab === null ? (
          <div
            onClick={() => setTab('docs')}
            className="w-full p-16 text-center flex flex-col items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex items-center justify-center">
              <Upload size={22} className="text-white/20 group-hover:text-brand-500 transition-colors" />
            </div>
            <div>
              <p className="font-bold text-white/90 text-lg">
                Add your sources, add user input <span className="text-brand-500 font-normal"> or </span> search the web
              </p>
              <p className="text-sm text-white/40 mt-1 max-w-2xl mx-auto leading-relaxed">
                Connect your process documentation, ERP exports, or search for best practices to initiate deeper agentic analysis.
              </p>
            </div>
            <div className="flex gap-3 text-xs text-white/20">
              {['PDF', 'DOCX', 'TXT', 'CSV', 'XLSX', 'XLS'].map(t => <FileTag key={t} label={t} />)}
            </div>
          </div>
        ) : (
          <>
            {/* Sidebar Glimmer */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-brand-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 blur-[120px] pointer-events-none" />

            <UploadSidebar tab={tab} setTab={setTab} setFiles={setFiles} setUserInput={setUserInput} />

            {/* Content Area */}
            <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
              <UploadDropzone
                tab={tab}
                userInput={userInput}
                setUserInput={setUserInput}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                inputRef={inputRef}
                dragging={dragging}
                addFiles={addFiles}
              />
              {error && (
                <div className="mt-4 flex items-center gap-3 text-brand-100 bg-brand-500/10 border border-brand-500/20 px-5 py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={16} className="text-brand-500 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <FileList files={files} removeFile={removeFile} tab={tab} userInput={userInput} removeText={() => setUserInput('')} />

      <button
        onClick={handleSubmit}
        disabled={loading || (files.length === 0 && (!userInput || userInput.trim() === ''))}
        className={clsx(
          "w-full relative group overflow-hidden py-3 rounded-xl transition-all duration-500 disabled:cursor-not-allowed",
          (loading || (files.length === 0 && (!userInput || userInput.trim() === ''))) ? "bg-brand-500/10" : "bg-brand-500"
        )}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center justify-center gap-3">
          {loading ? (
            <><Loader2 size={18} className="animate-spin text-brand-500/60" /><span className="text-brand-500/60 font-bold">Analyzing Process...</span></>
          ) : (
            <>
              <Upload size={18} className={clsx(
                "transition-transform",
                (files.length === 0 && (!userInput || userInput.trim() === '')) ? "text-brand-500/60" : "text-black group-hover:-translate-y-1"
              )} />
              <span className={clsx(
                "font-bold",
                (files.length === 0 && (!userInput || userInput.trim() === '')) ? "text-brand-500/60" : "text-black"
              )}>Analyze Process</span>
            </>
          )}
        </div>
      </button>
    </div>
  )
}

