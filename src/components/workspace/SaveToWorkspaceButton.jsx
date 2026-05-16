// Self-contained "Save to workspace" button + modal.
//
// Drop in anywhere you have an analyze result:
//
//     import SaveToWorkspaceButton from '../components/workspace/SaveToWorkspaceButton'
//     ...
//     <SaveToWorkspaceButton
//       analysis={result}
//       sessionId={session_id}
//       userInput={userInput}
//     />
//
// The component:
//   • prompts the user for a workspace name,
//   • sends the analyze JSON to POST /api/workspaces,
//   • shows the active plan-based quota (used / allowed),
//   • surfaces a 403 quota error inline with a link to /pricing or /account,
//   • does not depend on AnalysisPage or any existing component.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Loader2, X, AlertCircle, Check } from 'lucide-react'
import { createWorkspace, getWorkspaceQuota } from '../../services/workspaceApi'
import { rememberLastAnalysis } from '../../utils/lastAnalysis'

export default function SaveToWorkspaceButton({
  analysis,
  sessionId = null,
  userInput = '',
  defaultName = '',
  className = '',
  onSaved = null,
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [quota, setQuota] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [savedId, setSavedId] = useState(null)

  // Whenever an analysis is shown, also stash it for later use elsewhere.
  useEffect(() => {
    if (analysis) {
      rememberLastAnalysis({
        session_id: sessionId,
        user_input: userInput,
        analysis,
      })
    }
  }, [analysis, sessionId, userInput])

  const openModal = async () => {
    setOpen(true)
    setErr('')
    setSavedId(null)
    if (!name) {
      const seed =
        analysis?.process?.title ||
        analysis?.process?.name ||
        `Workspace ${new Date().toLocaleString()}`
      setName(seed)
    }
    try {
      const r = await getWorkspaceQuota()
      setQuota(r?.data || null)
    } catch (e) {
      // Non-fatal — the create call itself will enforce the quota.
      setQuota(null)
    }
  }

  const closeModal = () => {
    if (busy) return
    setOpen(false)
  }

  const submit = async () => {
    if (!analysis) {
      setErr('No analysis to save.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const r = await createWorkspace({
        name: name?.trim() || '',
        session_id: sessionId,
        user_input: userInput,
        analysis,
      })
      if (r?.status) {
        setSavedId(r.data?.id || null)
        setQuota(r.quota || null)
        if (onSaved) onSaved(r.data)
        // Auto-close after a short success flash.
        setTimeout(() => setOpen(false), 900)
      } else {
        setErr(r?.message || 'Could not save workspace')
      }
    } catch (e) {
      const code = e?.statuscode
      if (code === 403) {
        setErr(e.message ||
          'You have reached your plan workspace limit. Delete an old one or buy an addon packet.')
        if (e?.data?.data?.quota) setQuota(e.data.data.quota)
      } else if (code === 401) {
        setErr('Please sign in to save workspaces.')
      } else {
        setErr(e?.message || 'Could not save workspace')
      }
    } finally {
      setBusy(false)
    }
  }

  const atCap = quota && quota.allowed != null && quota.used >= quota.allowed

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          'inline-flex items-center gap-1.5 text-xs font-bold uppercase ' +
          'tracking-widest px-3 py-1.5 rounded-md border border-white/10 ' +
          'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 ' +
          'hover:text-white transition-colors ' + className
        }
      >
        <Bookmark size={13} /> Save to Workspace
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center
                     bg-black/70 backdrop-blur-sm px-4"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10
                       bg-[#0e0e10] p-6 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Save to a Workspace
                </h2>
                <p className="text-[11px] uppercase tracking-widest text-white/30 mt-1">
                  Stores the latest analysis under your account
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={busy}
                className="p-1 rounded text-white/40 hover:text-white hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <label className="block text-[11px] uppercase font-bold tracking-widest
                              text-white/40 mb-1.5">
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              disabled={busy || !!savedId}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Procurement audit"
              className="w-full rounded-md bg-black/40 border border-white/10
                         px-3 py-2 text-sm text-white placeholder:text-white/20
                         focus:outline-none focus:border-brand-500/60"
            />

            {err && (
              <div className="mt-3 rounded-md border border-red-500/30
                              bg-red-500/10 px-3 py-2 text-xs text-red-300
                              flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{err}</p>
                </div>
              </div>
            )}

            {savedId && (
              <div className="mt-3 rounded-md border border-emerald-500/30
                              bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300
                              flex items-center gap-2">
                <Check size={14} /> Saved.
              </div>
            )}


            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={busy}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest
                           text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !!savedId || !analysis}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest
                           rounded-md bg-brand-500 hover:bg-brand-600 text-white
                           disabled:opacity-40 disabled:cursor-not-allowed
                           inline-flex items-center gap-1.5"
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                {savedId ? 'Saved' : 'Save Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
