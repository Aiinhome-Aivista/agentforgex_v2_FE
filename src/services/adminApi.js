// Admin API client. Every endpoint requires a JWT belonging to a user
// with users.is_admin = 1.

import auth from './authApi'

// Identity
export const adminWhoami = () => auth.get('/admin/whoami')

// Users
export const adminListUsers   = (params = {}) =>
  auth.get('/admin/users', { params })
export const adminGetUser     = (uid) => auth.get(`/admin/users/${uid}`)
export const adminCreateUser  = (payload) => auth.post('/admin/users', payload)
export const adminUpdateUser  = (uid, payload) =>
  auth.patch(`/admin/users/${uid}`, payload)
export const adminDeleteUser  = (uid) => auth.delete(`/admin/users/${uid}`)

// Subscriptions
export const adminSubscriptions = (params = {}) =>
  auth.get('/admin/subscriptions', { params })
