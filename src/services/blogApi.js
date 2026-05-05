// Blog API client. Public endpoints (list/get) work without auth; admin
// writes use the same auth axios instance so the JWT is auto-attached.

import auth from './authApi'

export const listBlogPosts  = () => auth.get('/blog')
export const getBlogPost    = (slugOrId) => auth.get(`/blog/${slugOrId}`)

// Admin-only
export const createBlogPost = (payload) => auth.post('/blog', payload)
export const updateBlogPost = (id, payload) => auth.patch(`/blog/${id}`, payload)
export const deleteBlogPost = (id) => auth.delete(`/blog/${id}`)
