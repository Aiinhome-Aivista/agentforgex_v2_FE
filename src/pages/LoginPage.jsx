import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { loginUser } from '../services/api'


export default function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const isFilled = email !== '' && password !== '';

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await loginUser(email, password)
            // res is already unwrapped by the axios interceptor → res = { data, message, status, statuscode }
            if (res.status) {
                login(res.data)       // { id, name } stored in AuthContext
                navigate('/home')
            } else {
                setError(res.message || 'Login failed')
            }
        } catch (err) {
            // Server returned a non-2xx (e.g. 401) — message comes from interceptor
            setError(err.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark px-4 ">
            <div className="w-full max-w-md card p-8 space-y-7">
                <span className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
                    <Zap size={24} className="text-black" fill="black" />
                </span>
                {/* Title */}
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white">
                        Welcome to <span className="gradient-text">AgentForgeX</span>
                    </h2>
                    <p className="text-white/40 text-sm">
                        Enter your details to continue.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-white/60 ml-1">Email</label>
                        <div className="flex items-center border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 focus-within:ring-2 focus-within:ring-brand-500/30 transition-all">
                            <Mail size={16} className="text-white/20 mr-2" />
                            <input
                                type="email"
                                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-white/60 ml-1">Password</label>

                        <div className="flex items-center border border-white/10 rounded-xl px-4 py-2.5 bg-white/5 focus-within:ring-2 focus-within:ring-brand-500/30 transition-all">

                            <Lock size={16} className="text-white/20 mr-2" />

                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="ml-2 text-white/20 hover:text-white/50 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>

                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Button */}
                    <button
                        type="submit"
                        disabled={!isFilled || loading}
                        className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]
                           ${!isFilled || loading
                                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                : 'bg-brand-500 text-black hover:bg-brand-400 shadow-lg shadow-brand-500/20'
                            }
  `}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-white/40">
                    Don’t have an account?{' '}
                    <span
                        className="text-brand-500 font-bold cursor-pointer hover:text-brand-400 transition-colors"
                        onClick={() => navigate('/')}
                    >
                        Create account
                    </span>
                </p>
            </div>
        </div>
    )
}