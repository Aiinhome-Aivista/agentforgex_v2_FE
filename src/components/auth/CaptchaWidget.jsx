// Captcha widget for sign-in / sign-up forms.
//
// Usage:
//
//   const captchaRef = useRef(null)
//   ...
//   <CaptchaWidget ref={captchaRef} />
//   ...
//   const { token, answer } = captchaRef.current.getValues()
//   await signin({ ..., captcha_token: token, captcha_answer: answer })
//
// The widget fetches a fresh challenge on mount, exposes the prompt
// (e.g. "What is 7 + 4?") for the user to solve, and provides a refresh
// button. After a server-side rejection the parent should call
// `captchaRef.current.refresh()` to issue a new token.

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { RefreshCw, ShieldCheck, Loader2 } from 'lucide-react'
import { captchaNew } from '../../services/captchaApi'

const CaptchaWidget = forwardRef(function CaptchaWidget(
  { className = '', label = 'Verify you are human' },
  ref,
) {
  const [prompt, setPrompt]   = useState('')
  const [token, setToken]     = useState('')
  const [answer, setAnswer]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = async () => {
    setLoading(true); setError(''); setAnswer('')
    try {
      const r = await captchaNew()
      if (r?.status) {
        setPrompt(r.data.prompt)
        setToken(r.data.token)
      } else {
        setError(r?.message || 'Could not load captcha')
      }
    } catch (e) {
      setError(e?.message || 'Could not load captcha')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Imperative handle the parent can use just before submit.
  useImperativeHandle(ref, () => ({
    getValues: () => ({ token, answer: (answer || '').trim() }),
    refresh:   () => load(),
    reset:     () => setAnswer(''),
    isFilled:  () => Boolean(token && (answer || '').trim()),
  }), [token, answer])

  return (
    <div className={'space-y-1.5 ' + className}>
      <label className="block text-[11px] uppercase tracking-widest font-bold
                        text-white/40 inline-flex items-center gap-1.5">
        <ShieldCheck size={11} />
        {label}
      </label>
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border
                        border-white/10 text-sm font-mono tracking-wide
                        text-white/80 select-none">
          {loading
            ? <span className="inline-flex items-center gap-2 text-white/30">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </span>
            : (prompt || (error ? <span className="text-red-300">{error}</span>
                                : <span className="text-white/30">No challenge</span>))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="New captcha"
          className="px-3 rounded-lg border border-white/10 bg-white/[0.03]
                     hover:bg-white/[0.08] hover:border-white/20
                     text-white/50 hover:text-white transition-colors
                     disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type the answer"
        autoComplete="off"
        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border
                   border-white/10 text-sm text-white placeholder:text-white/20
                   focus:border-brand-500/50 focus:bg-white/[0.06] outline-none
                   transition-colors"
      />
    </div>
  )
})

export default CaptchaWidget
