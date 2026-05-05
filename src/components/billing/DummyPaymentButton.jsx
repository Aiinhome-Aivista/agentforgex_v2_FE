// Drop-in "Test Mode" button for activating plans / addons without going
// through Razorpay. Auto-hides whenever DUMMY_PAYMENTS_ENABLED is unset on
// the server, so this component is safe to leave in production builds.
//
// Usage examples:
//
//   {/* On a plan card in PricingPage.jsx */}
//   <DummyPaymentButton kind="plan" planCode={plan.code} onSuccess={refresh} />
//
//   {/* Next to the "Buy now" addon button in AccountPage.jsx */}
//   <DummyPaymentButton kind="addon" packets={packets} onSuccess={reload} />

import { useEffect, useState } from 'react'
import { FlaskConical, Loader2, Check, AlertCircle } from 'lucide-react'
import { dummyStatus, dummyActivate, dummyAddon } from '../../services/dummyPaymentApi'

export default function DummyPaymentButton({
  kind = 'plan',          // 'plan' | 'addon'
  planCode = null,        // required when kind === 'plan'
  packets = 1,            // required when kind === 'addon'
  label = null,           // override the default button text
  className = '',
  onSuccess = null,       // called with the response data after success
  disabled = false,
}) {
  const [enabled, setEnabled] = useState(null)   // null = unknown, false = off, true = on
  const [busy, setBusy]       = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState('')

  // Probe once on mount — call is unauthenticated and very cheap.
  useEffect(() => {
    let alive = true
    dummyStatus()
      .then((r) => { if (alive) setEnabled(!!r?.data?.enabled) })
      .catch(() => { if (alive) setEnabled(false) })
    return () => { alive = false }
  }, [])

  // Hide entirely when dummy mode is off — keeps prod UIs clean.
  if (enabled !== true) return null

  const handleClick = async () => {
    setErr(''); setBusy(true); setDone(false)
    try {
      let resp
      if (kind === 'addon') {
        resp = await dummyAddon(Math.max(1, Number(packets) || 1))
      } else {
        if (!planCode) throw new Error('planCode is required')
        resp = await dummyActivate(planCode)
      }
      if (!resp?.status) throw new Error(resp?.message || 'Test activation failed')
      setDone(true)
      if (onSuccess) onSuccess(resp.data)
      // Reset the success badge after a moment so the button can be reused.
      setTimeout(() => setDone(false), 1200)
    } catch (e) {
      setErr(e?.message || 'Test activation failed')
    } finally {
      setBusy(false)
    }
  }

  const text = label || (kind === 'addon'
    ? `Test: +${(Math.max(1, Number(packets) || 1)) * 10} workspaces`
    : `Test: activate ${planCode || ''}`)

  return (
    <div className={'space-y-1.5 ' + className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        title="Test mode: activate without payment (DUMMY_PAYMENTS_ENABLED on server)"
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2
                   text-[11px] uppercase tracking-widest font-bold rounded-lg
                   border border-amber-400/40 bg-amber-400/10
                   text-amber-200 hover:bg-amber-400/15 hover:text-amber-100
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy
          ? <Loader2 size={12} className="animate-spin" />
          : done
            ? <Check size={12} />
            : <FlaskConical size={12} />}
        {busy ? 'Activating…' : done ? 'Activated' : text}
      </button>
      {err && (
        <p className="text-[10px] text-red-300 inline-flex items-center gap-1">
          <AlertCircle size={10} /> {err}
        </p>
      )}
    </div>
  )
}
