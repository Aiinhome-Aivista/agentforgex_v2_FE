// Lightweight localStorage helpers that let any page snapshot the most
// recent /api/analyze response so a workspace can be saved from anywhere
// in the SPA — without modifying existing pages or services.
//
// Usage from a fresh /analyze response:
//
//     import { rememberLastAnalysis } from '../utils/lastAnalysis'
//     rememberLastAnalysis({ session_id, user_input, analysis: result })
//
// Usage when offering a "Save to workspace" action:
//
//     import { readLastAnalysis } from '../utils/lastAnalysis'
//     const snapshot = readLastAnalysis()
//
// The AnalysisPage already mirrors `result` into localStorage under
// `analysis_<id>`; this module additionally maintains a single
// `afx_last_analysis` slot so SaveToWorkspaceButton can find the most
// recent run regardless of which page the user is on.

const KEY = 'afx_last_analysis'

export function rememberLastAnalysis({ session_id, user_input, analysis } = {}) {
  if (!analysis) return
  try {
    localStorage.setItem(KEY, JSON.stringify({
      session_id: session_id || analysis?.process?.session_id || null,
      user_input: user_input || '',
      analysis,
      at: Date.now(),
    }))
  } catch {
    // localStorage full / blocked — nothing else we can do here.
  }
}

export function readLastAnalysis() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearLastAnalysis() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Convenience: build the POST body that /api/workspaces expects.
export function toWorkspacePayload(name, snapshot) {
  if (!snapshot || !snapshot.analysis) return null
  return {
    name: name || '',
    session_id: snapshot.session_id || null,
    user_input: snapshot.user_input || '',
    analysis: snapshot.analysis,
  }
}
