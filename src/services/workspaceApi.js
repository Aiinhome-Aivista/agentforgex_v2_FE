// Workspace API client. Reuses the auth axios instance (services/authApi.js)
// so the JWT is automatically attached to every request.
//
// All endpoints require auth and live under /api/workspaces.

import auth from './authApi'

// List + quota
export const listWorkspaces = () =>
  auth.get('/workspaces')

export const getWorkspaceQuota = () =>
  auth.get('/workspaces/quota')

// Create — saves a full analyze response under a workspace.
//   payload: { name?, session_id?, user_input?, analysis }
export const createWorkspace = (payload) =>
  auth.post('/workspaces', payload)

// Single workspace (includes the heavy analysis_data blob)
export const getWorkspace = (id) =>
  auth.get(`/workspaces/${id}`)

// Rename
export const renameWorkspace = (id, name) =>
  auth.patch(`/workspaces/${id}`, { name })

// Delete (user can remove older workspaces)
export const deleteWorkspace = (id) =>
  auth.delete(`/workspaces/${id}`)
