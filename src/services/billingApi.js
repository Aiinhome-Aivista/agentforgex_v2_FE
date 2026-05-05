// Billing endpoints. Reuses the auth axios instance for JWT injection.

import auth from './authApi'

export const listPlans     = () => auth.get('/billing/plans')
export const getConfig     = () => auth.get('/billing/config')
export const mySubscription = () => auth.get('/billing/subscription')
export const subscribeFree = () => auth.post('/billing/subscribe/free')
export const createOrder   = (payload) => auth.post('/billing/orders', payload)
export const verifyOrder   = (payload) => auth.post('/billing/orders/verify', payload)
export const getUsage      = () => auth.get('/billing/usage')
