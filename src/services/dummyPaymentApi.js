// Dummy payment API client. Reuses the auth axios instance for JWT injection.
//
// All endpoints live under /api/billing/dummy. Every endpoint except
// `dummyStatus` is gated on the server by the DUMMY_PAYMENTS_ENABLED env
// flag, so calls will return 403 when dummy mode is off.

import auth from './authApi'

// Public — returns { data: { enabled: bool } }
export const dummyStatus = () =>
  auth.get('/billing/dummy/status')

// Auth — instantly activate any plan: free | basic | premium
export const dummyActivate = (plan_code) =>
  auth.post('/billing/dummy/activate', { plan_code })

// Auth — instantly grant N×10 workspaces (requires an active paid plan)
export const dummyAddon = (packets) =>
  auth.post('/billing/dummy/addon', { packets })

// Auth — cancel the active plan (handy to re-test the upgrade flow)
export const dummyCancel = () =>
  auth.post('/billing/dummy/cancel')
