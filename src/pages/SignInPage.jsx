import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Zap, Loader2, AlertCircle } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import {
  signin, googleSignin, setToken, setStoredUser,
} from '../services/authApi'
import CaptchaWidget from '../components/auth/CaptchaWidget'

export default function SignInPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const captchaRef = useRef(null)
  const [googleEnabled, setGoogleEnabled] = useState(
    Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  )

  useEffect(() => {
    setGoogleEnabled(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID))
  }, [])

  const finishLogin = (res) => {
    setToken(res.token)
    setStoredUser(res.data)
    login(res.data)
    if (!res.data.plan) navigate('/pricing', { replace: true })
    else navigate('/home', { replace: true })
  }

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const cap = captchaRef.current?.getValues() || { token: '', answer: '' }
      const res = await signin(email.trim(), password, cap.token, cap.answer)
      if (!res?.status) captchaRef.current?.refresh()
      if (res.status) finishLogin(res)
      else setError(res.message || 'Sign-in failed')
    } catch (err) {
      setError(err.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setLoading(true)
    try {
      const res = await googleSignin(credentialResponse.credential)
      if (res.status) finishLogin(res)
      else setError(res.message || 'Google sign-in failed')
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const isFilled = email.trim() && password

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4 py-10">
      <div className="w-full max-w-md card p-8 space-y-6">
        <span className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
          <Zap size={24} className="text-black" fill="black" />
        </span>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white">
            Sign in to <span className="gradient-text">AgentForgeX</span>
          </h2>
          <p className="text-white/40 text-sm">
            Welcome back — let's get you to your workspace.
          </p>
        </div>

        {/* Google */}
        {googleEnabled ? (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Try again.')}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="pill"
              width="320"
            />
          </div>
        ) : (
          <div className="text-xs text-white/30 text-center">
            Google sign-in unavailable (admin: set VITE_GOOGLE_CLIENT_ID)
          </div>
        )}

        <div className="flex items-center gap-3 text-white/30 text-xs">
          <div className="flex-1 h-px bg-white/10" /> OR <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
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
              type={showPassword ? 'text' : 'password'} value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
            />
            <button type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="ml-2 text-white/20 hover:text-white/50 transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </Field>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <CaptchaWidget ref={captchaRef} />

          <button
            type="submit"
            disabled={!isFilled || loading}
            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
              ${(!isFilled || loading)
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                : 'bg-brand-500 text-black hover:bg-brand-400 shadow-lg shadow-brand-500/20'}`}>
            {loading ? (<><Loader2 size={18} className="animate-spin" /> Signing in...</>) : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40">
          New here?{' '}
          <Link to="/signup" className="text-brand-500 font-bold hover:text-brand-400 transition-colors">
            Create an account
          </Link>
        </p>
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
