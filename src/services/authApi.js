// Auth + billing API client. Uses its own axios instance to avoid touching the
// existing services/api.js. JWT is read from localStorage('afx_token') and
// sent as Authorization: Bearer <token>.

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}`
  : '/api'

export const TOKEN_KEY = 'afx_token'
export const USER_KEY  = 'afx_user'

export function getToken()        { return localStorage.getItem(TOKEN_KEY) }
export function setToken(token)   { token ? localStorage.setItem(TOKEN_KEY, token)
                                          : localStorage.removeItem(TOKEN_KEY) }
export function getStoredUser()   {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') }
  catch { return null }
}
export function setStoredUser(u)  { u ? localStorage.setItem(USER_KEY, JSON.stringify(u))
                                      : localStorage.removeItem(USER_KEY) }
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const auth = axios.create({ baseURL: BASE_URL })

auth.interceptors.request.use((cfg) => {
  const t = getToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

auth.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const r = err.response?.data
    const msg = r?.message || r?.error || err.message || 'Request failed'
    return Promise.reject(Object.assign(new Error(msg), {
      statuscode: r?.statuscode || err.response?.status,
      data: r,
    }))
  }
)

// ── Email signup (OTP based) ────────────────────────────────────────────────
// `payload` may include captcha_token + captcha_answer (the captcha is
// enforced on the server by the captcha gate).
export const signupRequestOtp = (payload) =>
  auth.post('/auth/signup/request-otp', payload)

export const signupVerifyOtp = (email, otp) =>
  auth.post('/auth/signup/verify-otp', { email, otp })

export const signupResendOtp = (email, captcha_token = '', captcha_answer = '') =>
  auth.post('/auth/signup/resend-otp', { email, captcha_token, captcha_answer })

// ── Email signin ────────────────────────────────────────────────────────────
export const signin = (email, password, captcha_token = '', captcha_answer = '') =>
  auth.post('/auth/signin', { email, password, captcha_token, captcha_answer })

// ── Google sign-in / sign-up ────────────────────────────────────────────────
export const googleSignin = (idToken, country = 'IN') =>
  auth.post('/auth/google', { id_token: idToken, country })

// ── Whoami ──────────────────────────────────────────────────────────────────
export const whoami = () => auth.get('/auth/me')

export default auth
