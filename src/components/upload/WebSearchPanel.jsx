// Working web-search panel for the analysis input section.
//
// Flow:
//   1. User types a query and hits "Search" (or Enter)
//   2. Panel calls POST /api/search/web → list of {title, url, snippet}
//   3. User checks the boxes for the results they want to include
//   4. "Add Selected to Input" appends a clean text block to the parent's
//      `userInput` state — the same text the analyze pipeline already
//      consumes — so the result feeds straight through to the existing
//      /api/analyze endpoint with no backend changes.
//
// The component is deliberately self-contained: parent only passes
// `userInput` + `setUserInput` and the rest is internal state.

import { useState, useEffect, useRef } from 'react'
import {
  Search, Loader2, AlertCircle, Plus, ExternalLink, Check, X, Globe,
} from 'lucide-react'
import { searchWeb, searchConfig } from '../../services/webSearchApi'

const SEPARATOR = '\n\n---\n\n'

function formatPickedResults(results) {
  return results.map((r, i) => {
    const lines = [`[Source ${i + 1}] ${r.title}`.trim()]
    if (r.url)     lines.push(r.url)
    if (r.snippet) lines.push(r.snippet)
    return lines.join('\n')
  }).join(SEPARATOR)
}

export default function WebSearchPanel({ userInput, setUserInput }) {
  const [query, setQuery]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [results, setResults]   = useState([])     // [{title,url,snippet}]
  const [provider, setProvider] = useState(null)
  const [selected, setSelected] = useState({})     // { url: true }
  const [addedCount, setAdded]  = useState(0)
  const inputRef = useRef(null)

  // Probe provider once on mount so we can show "Powered by …".
  useEffect(() => {
    let alive = true
    searchConfig()
      .then((r) => { if (alive) setProvider(r?.data?.provider || null) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setError(''); setBusy(true); setSelected({}); setAdded(0)
    try {
      const r = await searchWeb(q, 10)
      if (!r?.status) throw new Error(r?.message || 'Search failed')
      const items = r?.data?.results || []
      setResults(items)
      setProvider(r?.data?.provider || provider)
      if (items.length === 0) setError('No results found. Try different keywords.')
    } catch (e) {
      const code = e?.statuscode
      if (code === 401) setError('Please sign in to search the web.')
      else setError(e?.message || 'Search failed')
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !busy) {
      e.preventDefault()
      runSearch()
    }
  }

  const toggle = (url) =>
    setSelected((s) => ({ ...s, [url]: !s[url] }))

  const selectAll = () => {
    const all = {}
    results.forEach((r) => { if (r.url) all[r.url] = true })
    setSelected(all)
  }
  const clearSel = () => setSelected({})

  const picked = results.filter((r) => selected[r.url])

  const addSelectedToInput = () => {
    if (picked.length === 0) return
    const block = formatPickedResults(picked)
    const base = (userInput || '').trim()
    const next = base ? base + SEPARATOR + block : block
    setUserInput(next)
    setAdded(picked.length)
    // Don't clear results — user may want to keep adding from the same query.
    setSelected({})
    // Brief flash, then reset the indicator.
    setTimeout(() => setAdded(0), 1600)
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-full space-y-4">
      {/* Header strip */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30
                        flex items-center justify-center">
          <Search size={20} className="text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-lg leading-tight">Search the Web</p>
          <p className="text-xs text-white/40">
            Pick results to fold them into the analysis input.
            {provider && (
              <span className="ml-1 inline-flex items-center gap-1 text-white/30">
                <Globe size={10} /> via {provider}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="e.g. SAP procurement best practices, ERP order management workflow…"
          className="flex-1 px-3 py-3 bg-white/[0.05] border border-white/20 rounded-xl
                     text-white placeholder:text-white/40 outline-none font-medium
                     focus:border-brand-500/50 focus:bg-white/[0.08]
                     transition-all duration-300 placeholder:text-[13px]"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={!query.trim() || busy}
          className="px-4 py-3 bg-brand-500/10 hover:bg-brand-500/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     border border-brand-500/30 rounded-xl
                     transition-all duration-300 flex items-center gap-2
                     font-bold text-brand-400 hover:text-brand-300 whitespace-nowrap"
        >
          {busy ? <Loader2 size={17} className="animate-spin" />
                : <Search size={17} />}
          <span>{busy ? 'Searching…' : 'Search'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-300
                        bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between text-[11px]
                          uppercase font-bold tracking-widest text-white/40 px-1">
            <span>{results.length} results · {picked.length} selected</span>
            <div className="flex items-center gap-3">
              <button onClick={selectAll}
                className="hover:text-brand-400 transition-colors">
                Select all
              </button>
              <span className="text-white/10">|</span>
              <button onClick={clearSel}
                className="hover:text-white transition-colors">
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1
                          scrollbar-custom">
            {results.map((r, i) => {
              const isSelected = !!selected[r.url]
              return (
                <div
                  key={r.url || i}
                  onClick={() => toggle(r.url)}
                  className={
                    'group cursor-pointer rounded-xl border px-4 py-3 ' +
                    'transition-all flex gap-3 items-start ' +
                    (isSelected
                      ? 'bg-brand-500/10 border-brand-500/40'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20')
                  }
                >
                  <div className={
                    'flex-shrink-0 w-4 h-4 mt-1 rounded border flex items-center ' +
                    'justify-center transition-colors ' +
                    (isSelected
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-white/30 group-hover:border-white/60')
                  }>
                    {isSelected && <Check size={10} className="text-black" strokeWidth={4} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white truncate">
                        {r.title || '(untitled)'}
                      </p>
                      {r.url && (
                        <a
                          href={r.url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-white/30 hover:text-brand-400 flex-shrink-0
                                     opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Open in new tab"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    {r.url && (
                      <p className="text-[11px] text-brand-500/70 truncate mt-0.5
                                    font-mono">
                        {r.url.replace(/^https?:\/\//, '')}
                      </p>
                    )}
                    {r.snippet && (
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">
                        {r.snippet}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] uppercase font-bold tracking-widest text-white/40">
              {addedCount > 0
                ? <span className="text-brand-400 inline-flex items-center gap-1">
                    <Check size={10} /> Added {addedCount} source{addedCount > 1 ? 's' : ''} to input
                  </span>
                : picked.length > 0
                  ? `${picked.length} selected — ready to add`
                  : 'Tick the results you want to use as input'}
            </p>
            <button
              type="button"
              onClick={addSelectedToInput}
              disabled={picked.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                         text-xs font-bold tracking-wide
                         bg-brand-500 hover:bg-brand-400 text-black
                         shadow-lg shadow-brand-500/20
                         disabled:opacity-40 disabled:cursor-not-allowed
                         disabled:bg-white/5 disabled:text-white/30 disabled:shadow-none
                         transition-all"
            >
              <Plus size={13} /> Add Selected to Input
            </button>
          </div>
        </>
      )}

      {/* Show what's already in userInput so the user knows it's accumulating */}
      {userInput && userInput.trim() && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02]
                        px-4 py-3 text-[11px] text-white/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="uppercase font-bold tracking-widest text-white/40">
              Current input ({userInput.length.toLocaleString()} chars)
            </span>
            <button
              onClick={() => setUserInput('')}
              className="text-white/30 hover:text-red-400 inline-flex items-center gap-1"
              title="Clear input"
            >
              <X size={11} /> Clear
            </button>
          </div>
          <p className="line-clamp-3 leading-relaxed">{userInput}</p>
        </div>
      )}
    </div>
  )
}
