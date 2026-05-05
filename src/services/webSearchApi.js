// Web search API client. Reuses the auth axios instance for JWT injection.

import auth from './authApi'

// POST /api/search/web → { data: { provider, query, results: [{title,url,snippet}] } }
export const searchWeb = (query, max_results = 8) =>
  auth.post('/search/web', { query, max_results })

// GET /api/search/config → { data: { provider } }
export const searchConfig = () =>
  auth.get('/search/config')
