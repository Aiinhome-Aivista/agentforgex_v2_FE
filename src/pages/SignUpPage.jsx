import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Mail, Lock, User, Eye, EyeOff, Zap, Loader2, AlertCircle,
  ArrowLeft, RefreshCw,
} from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import {
  signupRequestOtp, signupVerifyOtp, signupResendOtp,
  googleSignin, setToken, setStoredUser,
} from '../services/authApi'
import CaptchaWidget from '../components/auth/CaptchaWidget'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // step 1 = collect details, step 2 = OTP entry
  const [step, setStep] = useState(1)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resendIn, setResendIn] = useState(0)
  const [debugOtp, setDebugOtp] = useState(null) // shown only when SMTP is dev-mode

  const [loading, setLoading] = useState(false)
  const captchaRef = useRef(null)
  const [error, setError]     = useState('')

  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const finishLogin = (res) => {
    setToken(res.token)
    setStoredUser(res.data)
    login(res.data)
    if (!res.data.plan) navigate('/pricing', { replace: true })
    else navigate('/home', { replace: true })
  }

  // ── Step 1 → request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || name.trim().length < 2) return setError('Name must be at least 2 characters')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email')
    if (password.length < 8) return setError('Password must be at least 8 characters')

    const cap = captchaRef.current?.getValues() || { token: '', answer: '' }
    setLoading(true)
    try {
      const res = await signupRequestOtp({
        name: name.trim(), email: email.trim().toLowerCase(),
        password,
        captcha_token: cap.token, captcha_answer: cap.answer,
      })
      if (res.status) {
        setStep(2)
        setResendIn(30)
        if (res.debug_otp) setDebugOtp(res.debug_otp)
      } else {
        setError(res.message || 'Could not send OTP')
      }
    } catch (err) {
      setError(err.message || 'Could not send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 → verify OTP ───────────────────────────────────────────────────
  const otpString = otp.join('')
  const handleVerify = async (e) => {
    e?.preventDefault()
    setError('')
    if (otpString.length !== 6) return setError('Enter the 6-digit code')

    setLoading(true)
    try {
      const res = await signupVerifyOtp(email.trim().toLowerCase(), otpString)
      if (res.status) finishLogin(res)
      else setError(res.message || 'Invalid OTP')
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendIn > 0) return
    setError(''); setLoading(true); setDebugOtp(null)
    try {
      const res = await signupResendOtp(email.trim().toLowerCase())
      if (res.status) {
        setResendIn(30)
        if (res.debug_otp) setDebugOtp(res.debug_otp)
      } else {
        setError(res.message || 'Could not resend')
      }
    } catch (err) {
      setError(err.message || 'Could not resend')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`)
      el && el.focus()
    }
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const el = document.getElementById(`otp-${i - 1}`)
      el && el.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setOtp(next)
    const idx = Math.min(text.length, 5)
    const el = document.getElementById(`otp-${idx}`)
    el && el.focus()
  }

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (cred) => {
    setError(''); setLoading(true)
    try {
      const res = await googleSignin(cred.credential)
      if (res.status) finishLogin(res)
      else setError(res.message || 'Google sign-in failed')
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4 py-10">
      <div className="w-full max-w-md card p-8 space-y-6">
        <span className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
          <Zap size={24} className="text-black" fill="black" />
        </span>

        {step === 1 ? (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white">
                Create your <span className="gradient-text">AgentForgeX</span> account
              </h2>
              <p className="text-white/40 text-sm">
                Start with a 3-day free trial. No card needed.
              </p>
            </div>

            {googleEnabled && (
              <>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed. Try again.')}
                    theme="filled_black"
                    size="large"
                    text="signup_with"
                    shape="pill"
                    width="320"
                  />
                </div>
                <div className="flex items-center gap-3 text-white/30 text-xs">
                  <div className="flex-1 h-px bg-white/10" /> OR <div className="flex-1 h-px bg-white/10" />
                </div>
              </>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Field label="Full name" icon={<User size={16} className="text-white/20 mr-2" />}>
                <input
                  type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
                />
              </Field>

              <Field label="Email" icon={<Mail size={16} className="text-white/20 mr-2" />}>
                <input
                  type="email" value={email} autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
                />
              </Field>

              <Field label="Password" icon={<Lock size={16} className="text-white/20 mr-2" />}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
                />
                <button type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="ml-2 text-white/20 hover:text-white/50 transition-colors">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </Field>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}

              <CaptchaWidget ref={captchaRef} />

              <button
                type="submit" disabled={loading}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                  ${loading
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'bg-brand-500 text-black hover:bg-brand-400 shadow-lg shadow-brand-500/20'}`}>
                {loading ? (<><Loader2 size={18} className="animate-spin" /> Sending OTP...</>) : 'Send verification code'}
              </button>
            </form>

            <p className="text-center text-sm text-white/40">
              Already have an account?{' '}
              <Link to="/signin" className="text-brand-500 font-bold hover:text-brand-400 transition-colors">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep(1); setError(''); setDebugOtp(null) }}
              className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1 -mt-2">
              <ArrowLeft size={14} /> Back
            </button>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">Verify your email</h2>
              <p className="text-white/40 text-sm">
                We sent a 6-digit code to <span className="text-white/80 font-medium">{email}</span>.
              </p>
            </div>

            {debugOtp && (
              <div className="text-xs px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                <strong>Dev mode:</strong> SMTP not configured — your code is <code className="font-mono">{debugOtp}</code>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i} id={`otp-${i}`}
                    inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    className="w-12 h-14 text-center text-2xl font-black bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                  />
                ))}
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}

              <button
                type="submit" disabled={otpString.length !== 6 || loading}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                  ${(otpString.length !== 6 || loading)
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'bg-brand-500 text-black hover:bg-brand-400 shadow-lg shadow-brand-500/20'}`}>
                {loading ? (<><Loader2 size={18} className="animate-spin" /> Verifying...</>) : 'Verify & continue'}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || loading}
                className="w-full text-sm text-white/50 hover:text-white/80 flex items-center justify-center gap-2 disabled:cursor-not-allowed">
                <RefreshCw size={14} className={resendIn > 0 ? '' : 'hover:rotate-90 transition-transform'} />
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-white/60 ml-1">{label}</label>
      <div className="flex items-center border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 focus-within:ring-2 focus-within:ring-brand-500/30 transition-all">
        {icon}{children}
      </div>
    </div>
  )
}
