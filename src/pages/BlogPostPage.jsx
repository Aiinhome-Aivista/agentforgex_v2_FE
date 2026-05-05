import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Tag, Loader2, AlertCircle, User, ChevronRight, Share2, Facebook, Twitter, Linkedin, Search
} from 'lucide-react'
import { getBlogPost, listBlogPosts } from '../services/blogApi'
import DOMPurify from 'dompurify';
import SocialShare from './SocialShare';

export default function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [allPosts, setAllPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    
    Promise.all([
      getBlogPost(slug),
      listBlogPosts()
    ])
      .then(([postRes, listRes]) => {
        if (!cancelled) {
          setPost(postRes?.data || null)
          setAllPosts(listRes?.data || [])
        }
      })
      .catch((e) => { 
        if (!cancelled) setError(e?.message || 'Could not load post') 
      })
      .finally(() => { 
        if (!cancelled) setLoading(false) 
      })
      
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-brand-dark text-white px-4 py-20 text-center">
        <p className="text-red-300 mb-4 inline-flex items-center gap-2 text-sm">
          <AlertCircle size={14} /> {error || 'Post not found'}
        </p>
        <div>
          <button
            onClick={() => navigate('/blog')}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={14} /> Back to Blog
          </button>
        </div>
      </div>
    )
  }

  const currentIndex = allPosts.findIndex(p => p.slug === slug)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex !== -1 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  
  // Hardcoded Related Posts for now as requested
  // const relatedPosts = [
  //   {
  //     id: 1,
  //     title: "How AgentForgeX is Transforming AI Workflow Automation",
  //     slug: "how-agentforgex-is-transforming-ai-workflow-automation",
  //     cover_url: "https://picsum.photos/seed/post1/400/300",
  //     created_at: "2026-05-01"
  //   },
  //   {
  //     id: 2,
  //     title: "The Future of Low-Code AI Development",
  //     slug: "future-of-low-code-ai",
  //     cover_url: "https://picsum.photos/seed/post2/400/300",
  //     created_at: "2026-04-28"
  //   },
  //   {
  //     id: 3,
  //     title: "Building Scalable AI Solutions with AgentForgeX",
  //     slug: "building-scalable-ai-solutions",
  //     cover_url: "https://picsum.photos/seed/post3/400/300",
  //     created_at: "2026-04-25"
  //   }
  // ];

  // Render content as plain prose with line breaks preserved.
  // We deliberately do NOT dangerouslySetInnerHTML to avoid XSS — admins
  // who want richer formatting can use markdown-style line breaks and
  // simple emphasis, which CSS handles via white-space:pre-wrap.
  return (
    <div className="min-h-screen bg-brand-dark text-white px-4 py-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-white/10 pb-6">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-white/50 whitespace-nowrap overflow-hidden">
            <button onClick={() => navigate('/home')} className="hover:text-white transition-colors">Home</button>
            <ChevronRight size={14} className="mx-1 text-white/30 shrink-0" />
            <button onClick={() => navigate('/blog')} className="hover:text-white transition-colors">Blogs</button>
            <ChevronRight size={14} className="mx-1 text-white/30 shrink-0" />
            <span className="text-white truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]" title={post.title}>
              {post.title}
            </span>
          </div>

          {/* Author info aligned on the right, above sidebar */}
          <div className="shrink-0 flex flex-col items-start md:items-end">
            <div className="text-sm">
              <span className="font-bold text-white">Author : </span>
              <span className="text-[#10B981] italic font-serif">{post.author_name || 'Chief Administrator'}</span>
            </div>
            <div className="text-[10px] uppercase text-white/50 text-left w-full md:text-right">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Column (Main Content) */}
          <div className="w-full">

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-8">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-white/70 mb-8">
              {post.excerpt}
            </p>
          )}

          {/* Image */}
          {post.image_url  && (
            <img
              src={post.image_url}
              alt="Blog Post Cover"
              className="w-full max-h-[480px] rounded-[2.5rem] object-cover bg-white/5 mb-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] border border-white/10"
            />
          )}

          {/* Content */}
          <article
            className="prose prose-invert max-w-none text-white/80"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content),
            }}
          />

          {/* Tags */}
          {post.tags && (
            <div className="flex items-center flex-wrap gap-4 mt-10">
              <span className="text-sm font-black tracking-widest text-white uppercase">
                TAGS
              </span>
              <div className="flex flex-wrap gap-2">
                {post.tags.split(',').map((tag, idx) => (
                  <span key={idx} className="px-4 py-1.5 rounded-full border border-white/20 bg-transparent text-xs font-bold uppercase tracking-wider text-[#10B981]">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-10 border-t border-white/10 pt-8">
            <SocialShare />
          </div>

          {/* Previous / Next Post */}
          <div className="mt-8 border-t border-white/10 pt-8 flex flex-col sm:flex-row gap-4 justify-between">
            {prevPost ? (
              <div 
                onClick={() => navigate(`/blog/${prevPost.slug}`)}
                className="flex-1 text-left bg-white/[0.02] hover:bg-white/[0.05] p-4 rounded-xl cursor-pointer transition-colors border border-white/5"
              >
                <p className="text-[10px] uppercase tracking-widest text-[#10B981] mb-1 font-bold">Previous Post</p>
                <h4 className="text-sm font-bold text-white/90">{prevPost.title}</h4>
              </div>
            ) : <div className="flex-1" />}
            
            {nextPost ? (
              <div 
                onClick={() => navigate(`/blog/${nextPost.slug}`)}
                className="flex-1 text-right bg-white/[0.02] hover:bg-white/[0.05] p-4 rounded-xl cursor-pointer transition-colors border border-white/5"
              >
                <p className="text-[10px] uppercase tracking-widest text-[#10B981] mb-1 font-bold">Next Post</p>
                <h4 className="text-sm font-bold text-white/90">{nextPost.title}</h4>
              </div>
            ) : <div className="flex-1" />}
          </div>
          
        </div>

        {/* Right Column (Sidebar Card) - Commented out for now
        <div className="lg:w-1/3 lg:pl-6">
          <div className="sticky top-8">
            <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white/90">
                  Related <span className="text-white/40">Articles</span>
                </h3>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <Search size={18} />
                </div>
              </div>

              <div className="space-y-8">
                {relatedPosts.map((rp) => (
                  <div key={rp.id} onClick={() => navigate(`/blog/${rp.slug}`)} className="group cursor-pointer flex gap-4 items-center">
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 overflow-hidden">
                      <img 
                        src={rp.cover_url} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white/90 group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug mb-1">
                        {rp.title}
                      </h4>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-tight">
                        {new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        */}
      </div>
    </div>
  )
}
