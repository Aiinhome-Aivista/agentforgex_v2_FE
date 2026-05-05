// Captcha API client — no auth required for issuing a challenge.
// The captcha (token + answer typed by the user) is included in the body
// of /auth/signin and /auth/signup/* requests; the existing authApi
// callers just spread these fields into their payloads.

import auth from './authApi'

export const captchaNew    = () => auth.get('/captcha/new')
export const captchaStatus = () => auth.get('/captcha/status')
