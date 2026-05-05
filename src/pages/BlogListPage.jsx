import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Newspaper, Calendar, Tag, ArrowRight, Loader2, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { listBlogPosts } from '../services/blogApi'

export default function BlogListPage() {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    listBlogPosts()
      .then((r) => { if (!cancelled) setItems(r?.data || []) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load posts') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-brand-dark text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/home')}
          className="text-white/50 hover:text-white text-sm mb-6 inline-flex
                     items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <span className="w-12 h-12 rounded-2xl bg-brand-500/15 border
                           border-brand-500/30 flex items-center justify-center">
            <Newspaper size={22} className="text-brand-400" />
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="gradient-text">AgentForgeX</span> Blog
            </h1>
            <p className="text-white/40 text-sm">
              Updates, automation playbooks, and product deep-dives.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 text-sm text-red-300 bg-red-500/10
                          border border-red-500/30 px-4 py-3 rounded-xl
                          flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Newspaper size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">No blog posts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="card p-6 hover:bg-white/[0.06] block group transition-colors"
              >
                <div className="flex items-start gap-4">
                  {p.image_url && (
                    <img
                      src={p.image_url} alt=""
                      className="w-24 h-24 rounded-xl object-cover bg-white/5
                                 flex-shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white group-hover:text-brand-400
                                   transition-colors">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="text-sm text-white/50 mt-1.5 line-clamp-2">
                        {p.excerpt}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-3
                                    text-[11px] uppercase tracking-widest
                                    font-bold text-white/30">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                      {p.author_name && (
                        <span className="text-white/30">
                          · {p.author_name}
                        </span>
                      )}
                      {p.tags && (
                        <span className="inline-flex items-center gap-1
                                         text-brand-500/80">
                          <Tag size={10} /> {p.tags}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1
                                       text-brand-400 opacity-0 group-hover:opacity-100
                                       transition-opacity">
                        Read <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
