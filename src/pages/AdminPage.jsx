import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users as UsersIcon, CreditCard, Newspaper,
  Loader2, AlertCircle, Plus, Trash2, Search, RefreshCw,
  CheckCircle2, XCircle, Pencil, Eye, EyeOff, ChevronDown
} from 'lucide-react'
import JoditEditor from '../components/JoditEditor'
import { useAuth } from '../context/AuthContext'
import {
  adminWhoami, adminListUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminSubscriptions,
} from '../services/adminApi'
import {
  listBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, getBlogPost,
} from '../services/blogApi'

const TABS = [
  { id: 'users',  label: 'Users',         icon: UsersIcon },
  { id: 'subs',   label: 'Subscriptions', icon: CreditCard },
  { id: 'blog',   label: 'Blog',          icon: Newspaper },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab]             = useState('users')
  const [authorized, setAuth]     = useState(null)  // null | true | false
  const [error, setError]         = useState('')

  // Confirm the caller is an admin before showing anything sensitive.
  useEffect(() => {
    let cancelled = false
    adminWhoami()
      .then(() => { if (!cancelled) setAuth(true) })
      .catch((e) => {
        if (cancelled) return
        setAuth(false)
        setError(e?.statuscode === 403
          ? 'You do not have admin access.'
          : (e?.message || 'Could not verify admin access'))
      })
    return () => { cancelled = true }
  }, [])

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30
                        flex items-center justify-center mx-auto mb-4">
          <Shield size={22} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access denied</h1>
        <p className="text-white/40 text-sm mb-5">{error}</p>
        <button onClick={() => navigate('/home')} className="btn-secondary text-sm">
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30
                         flex items-center justify-center">
          <Shield size={22} className="text-brand-400" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Admin Panel
          </h1>
          <p className="text-white/40 text-xs">
            Signed in as <span className="text-white/70">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 mb-5 border-b border-white/10">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold ' +
              'uppercase tracking-widest border-b-2 transition-colors ' +
              (tab === id
                ? 'border-brand-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/70')
            }
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'subs'  && <SubscriptionsTab />}
      {tab === 'blog'  && <BlogTab />}
    </div>
  )
}


// ── Users tab ──────────────────────────────────────────────────────────────
function UsersTab() {
  const [items, setItems]   = useState([])
  const [total, setTotal]   = useState(0)
  const [q, setQ]           = useState('')
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')
  const [creating, setCreate] = useState(false)
  const [confirmId, setConfirm] = useState(null)
  const [pendingId, setPending] = useState(null)

  const load = useCallback(async () => {
    setLoad(true); setError('')
    try {
      const r = await adminListUsers({ q: q || undefined, limit: 200 })
      setItems(r?.data || [])
      setTotal(r?.total || 0)
    } catch (e) {
      setError(e?.message || 'Could not load users')
    } finally { setLoad(false) }
  }, [q])

  useEffect(() => { load() }, [load])

  const onDelete = async (uid) => {
    setPending(uid); setError('')
    try {
      await adminDeleteUser(uid)
      setItems((arr) => arr.filter((u) => u.id !== uid))
    } catch (e) {
      setError(e?.message || 'Could not delete user')
    } finally {
      setPending(null); setConfirm(null)
    }
  }

  const toggleAdmin = async (u) => {
    try {
      const r = await adminUpdateUser(u.id, { is_admin: !u.is_admin })
      setItems((arr) => arr.map(x => x.id === u.id
        ? { ...x, is_admin: r.data.is_admin } : x))
    } catch (e) { setError(e?.message || 'Update failed') }
  }
  const toggleActive = async (u) => {
    try {
      const r = await adminUpdateUser(u.id, { is_active: !u.is_active })
      setItems((arr) => arr.map(x => x.id === u.id
        ? { ...x, is_active: r.data.is_active } : x))
    } catch (e) { setError(e?.message || 'Update failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                                       text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03]
                       border border-white/10 text-sm text-white
                       placeholder:text-white/30 outline-none
                       focus:border-brand-500/50"
          />
        </div>
        <button
          onClick={load}
          className="px-3 py-2 text-xs uppercase tracking-widest font-bold
                     rounded-lg border border-white/10 bg-white/[0.03]
                     hover:bg-white/[0.08] text-white/70 inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
        <button
          onClick={() => setCreate(true)}
          className="px-3 py-2 text-xs uppercase tracking-widest font-bold
                     rounded-lg bg-brand-500 hover:bg-brand-400 text-black
                     inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> New user
        </button>
      </div>

      <p className="text-[11px] uppercase font-bold tracking-widest text-white/30">
        {total.toLocaleString()} user{total === 1 ? '' : 's'}
      </p>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30
                        px-3 py-2 rounded-lg flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest
                            font-bold text-white/40">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-center">Admin</th>
              <th className="px-4 py-3 text-right">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <Loader2 size={18} className="animate-spin inline text-brand-500" />
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30">
                No users found.
              </td></tr>
            ) : items.map((u) => (
              <tr key={u.id}
                  className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-bold text-white/90 truncate">{u.name}</div>
                  <div className="text-[11px] text-white/40 truncate">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-white/60 text-xs uppercase tracking-wider">
                  {u.plan_code || <span className="text-white/20">—</span>}
                  {u.plan_code && u.sub_status !== 'active' && (
                    <span className="ml-1 text-white/30">({u.sub_status})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(u)} title="Toggle active"
                          className="text-white/60 hover:text-white">
                    {u.is_active
                      ? <CheckCircle2 size={16} className="text-emerald-400" />
                      : <XCircle      size={16} className="text-red-400" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleAdmin(u)} title="Toggle admin"
                          className="text-white/60 hover:text-white">
                    {u.is_admin
                      ? <Shield size={16} className="text-brand-400" />
                      : <Shield size={16} className="text-white/15" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-right text-[11px] text-white/40">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmId === u.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => setConfirm(null)}
                              disabled={pendingId === u.id}
                              className="text-[10px] uppercase font-bold tracking-widest
                                         px-2 py-1 text-white/60 hover:text-white">
                        Cancel
                      </button>
                      <button onClick={() => onDelete(u.id)}
                              disabled={pendingId === u.id}
                              className="text-[10px] uppercase font-bold tracking-widest
                                         px-2 py-1 rounded bg-red-500/80 hover:bg-red-500
                                         text-white inline-flex items-center gap-1
                                         disabled:opacity-50">
                        {pendingId === u.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <Trash2 size={10} />}
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirm(u.id)}
                            className="p-1.5 rounded text-white/30 hover:text-red-400
                                       hover:bg-red-500/10">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserModal
          onClose={() => setCreate(false)}
          onCreated={(u) => { setCreate(false); setItems((arr) => [u, ...arr]) }}
        />
      )}
    </div>
  )
}


function CreateUserModal({ onClose, onCreated }) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const r = await adminCreateUser({ name, email, password, is_admin: isAdmin })
      if (r?.status) onCreated(r.data)
      else setError(r?.message || 'Could not create user')
    } catch (e) {
      setError(e?.message || 'Could not create user')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center
                    bg-black/70 backdrop-blur-sm px-4"
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-md rounded-xl border border-white/10
                      bg-[#0e0e10] p-6 shadow-2xl">
        <h2 className="text-base font-bold text-white tracking-tight mb-1">
          Create new user
        </h2>
        <p className="text-[11px] uppercase font-bold tracking-widest
                      text-white/30 mb-4">
          User will be email-verified by default.
        </p>

        <div className="space-y-3">
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <div>
            <label className="block text-[11px] uppercase tracking-widest
                              font-bold text-white/40 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg bg-white/[0.03]
                           border border-white/10 text-sm text-white
                           focus:border-brand-500/50 outline-none"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2
                                 p-1 text-white/30 hover:text-white">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60
                            cursor-pointer">
            <input type="checkbox" checked={isAdmin}
                   onChange={(e) => setIsAdmin(e.target.checked)} />
            <span>Grant admin access</span>
          </label>
        </div>

        {error && (
          <div className="mt-3 text-[11px] text-red-300 bg-red-500/10
                          border border-red-500/30 px-3 py-2 rounded-lg
                          flex items-start gap-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy}
                  className="px-4 py-2 text-xs uppercase font-bold tracking-widest
                             text-white/60 hover:text-white">
            Cancel
          </button>
          <button onClick={submit}
                  disabled={busy || !name || !email || !password}
                  className="px-4 py-2 text-xs uppercase font-bold tracking-widest
                             rounded-lg bg-brand-500 hover:bg-brand-400 text-black
                             inline-flex items-center gap-1.5
                             disabled:opacity-40 disabled:cursor-not-allowed">
            {busy && <Loader2 size={12} className="animate-spin" />}
            Create user
          </button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest
                        font-bold text-white/40 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.03]
                   border border-white/10 text-sm text-white
                   focus:border-brand-500/50 outline-none"
      />
    </div>
  )
}


// ── Subscriptions tab ──────────────────────────────────────────────────────
function SubscriptionsTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [planFilter, setPlan] = useState('')
  const [statusFilter, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await adminSubscriptions({
        plan_code: planFilter || undefined,
        status:    statusFilter || undefined,
        limit: 500,
      })
      setData(r?.data || null)
    } catch (e) {
      setError(e?.message || 'Could not load subscriptions')
    } finally { setLoading(false) }
  }, [planFilter, statusFilter])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return <div className="flex justify-center py-16">
      <Loader2 size={20} className="animate-spin text-brand-500" />
    </div>
  }

  const agg = data?.aggregates || {}
  const items = data?.items || []

  return (
    <div className="space-y-4">
      {/* Aggregates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total users"     value={agg.users_total ?? 0} />
        <Stat label="Active subs"     value={agg.active_total ?? 0} />
        <Stat label="Free|active"     value={agg.by_plan_status?.['free|active']    ?? 0} />
        <Stat label="Basic|active"    value={agg.by_plan_status?.['basic|active']   ?? 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={planFilter} onChange={(e) => setPlan(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-white/[0.03]
                           border border-white/10 text-white">
          <option value="" className="bg-[#0e0e10]">All plans</option>
          <option value="free" className="bg-[#0e0e10]">Free</option>
          <option value="basic" className="bg-[#0e0e10]">Basic</option>
          <option value="premium" className="bg-[#0e0e10]">Premium</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-white/[0.03]
                           border border-white/10 text-white">
          <option value="" className="bg-[#0e0e10]">All statuses</option>
          <option value="active" className="bg-[#0e0e10]">Active</option>
          <option value="expired" className="bg-[#0e0e10]">Expired</option>
          <option value="cancelled" className="bg-[#0e0e10]">Cancelled</option>
        </select>
        <button onClick={load}
                className="px-3 py-2 text-xs uppercase tracking-widest font-bold
                           rounded-lg border border-white/10 bg-white/[0.03]
                           hover:bg-white/[0.08] text-white/70
                           inline-flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30
                        px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest
                            font-bold text-white/40">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Period end</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/30">
                No subscriptions match the filter.
              </td></tr>
            ) : items.map((s) => (
              <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-bold text-white/90 truncate">{s.user_name}</div>
                  <div className="text-[11px] text-white/40 truncate">{s.user_email}</div>
                </td>
                <td className="px-4 py-3 text-white/70 text-xs uppercase tracking-wider">
                  {s.plan_code}
                </td>
                <td className="px-4 py-3">
                  <span className={
                    'text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ' +
                    (s.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-white/5 text-white/40')
                  }>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white/70">
                  {s.currency} {Number(s.amount || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-[11px] text-white/40">
                  {s.period_end ? new Date(s.period_end).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">
        {label}
      </div>
      <div className="text-2xl font-black tabular-nums mt-1 text-white">
        {Number(value).toLocaleString()}
      </div>
    </div>
  )
}


// ── Blog tab ───────────────────────────────────────────────────────────────
function BlogTab() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [editing, setEditing] = useState(null)   // post object or 'new'
  const [confirmId, setConfirm] = useState(null)
  const [pendingId, setPending] = useState(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await listBlogPosts()
      setItems(r?.data || [])
    } catch (e) {
      setError(e?.message || 'Could not load posts')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const onDelete = async (id) => {
    setPending(id); setError('')
    try {
      await deleteBlogPost(id)
      setItems((arr) => arr.filter((p) => p.id !== id))
    } catch (e) { setError(e?.message || 'Delete failed') }
    finally { setPending(null); setConfirm(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase font-bold tracking-widest text-white/30">
          {items.length} post{items.length === 1 ? '' : 's'}
        </p>
        <div className="flex gap-2">
          <button onClick={load}
                  className="px-3 py-2 text-xs uppercase tracking-widest font-bold
                             rounded-lg border border-white/10 bg-white/[0.03]
                             hover:bg-white/[0.08] text-white/70
                             inline-flex items-center gap-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setEditing('new')}
                  className="px-3 py-2 text-xs uppercase tracking-widest font-bold
                             rounded-lg bg-brand-500 hover:bg-brand-400 text-black
                             inline-flex items-center gap-1.5">
            <Plus size={12} /> New post
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30
                        px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="space-y-2">
        {loading && items.length === 0 ? (
          <div className="py-10 text-center">
            <Loader2 size={18} className="animate-spin inline text-brand-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-white/30 text-sm">
            No posts yet — click "New post".
          </div>
        ) : items.map((p) => (
          <div key={p.id}
               className="card p-4 flex items-center justify-between gap-3
                          hover:bg-white/[0.05] transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white/90 truncate">{p.title}</p>
              <p className="text-[11px] text-white/40 truncate">
                {p.slug} · {new Date(p.created_at).toLocaleDateString()}
                {p.published ? '' : ' · DRAFT'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {confirmId === p.id ? (
                <>
                  <button onClick={() => setConfirm(null)}
                          disabled={pendingId === p.id}
                          className="text-[10px] uppercase font-bold tracking-widest
                                     px-2 py-1 text-white/60 hover:text-white">
                    Cancel
                  </button>
                  <button onClick={() => onDelete(p.id)}
                          disabled={pendingId === p.id}
                          className="text-[10px] uppercase font-bold tracking-widest
                                     px-2 py-1 rounded bg-red-500/80 hover:bg-red-500
                                     text-white inline-flex items-center gap-1">
                    {pendingId === p.id
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Trash2 size={10} />}
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={async () => {
                            // Need full content for the editor
                            try { const r = await getBlogPost(p.id); setEditing(r.data) }
                            catch (e) { setError(e?.message || 'Load failed') }
                          }}
                          className="p-2 rounded text-white/40 hover:text-brand-400
                                     hover:bg-brand-500/10"
                          title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirm(p.id)}
                          className="p-2 rounded text-white/40 hover:text-red-400
                                     hover:bg-red-500/10"
                          title="Delete">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BlogEditor
          post={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setEditing(null)
            setItems((arr) => {
              const i = arr.findIndex(x => x.id === p.id)
              if (i >= 0) { const out = [...arr]; out[i] = p; return out }
              return [p, ...arr]
            })
          }}
        />
      )}
    </div>
  )
}


function BlogEditor({ post, onClose, onSaved }) {
  const [title, setTitle]     = useState(post?.title || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [tags, setTags]       = useState(post?.tags || '')
  const [coverUrl, setCoverUrl] = useState(post?.cover_url || post?.image_url || '')
  const [imageFile, setImageFile] = useState(null)
  const [published, setPub]   = useState(post ? !!post.published : true)
  
  // SEO fields
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || '')
  const [metaDesc, setMetaDesc]   = useState(post?.meta_description || '')
  const [metaKw, setMetaKw]       = useState(post?.meta_keywords || '')
  const [canonical, setCanonical] = useState(post?.canonical_url || '')
  const [indexStatus, setIndex]   = useState(post?.index_status || 'index')
  const [seoOpen, setSeoOpen]     = useState(false)

  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const payload = new FormData()
      payload.append('title', title)
      payload.append('content', content)
      if (excerpt) payload.append('excerpt', excerpt)
      if (tags) payload.append('tags', tags)
      payload.append('published', published ? 1 : 0)
      if (metaTitle) payload.append('meta_title', metaTitle)
      if (metaDesc) payload.append('meta_description', metaDesc)
      if (metaKw) payload.append('meta_keywords', metaKw)
      if (canonical) payload.append('canonical_url', canonical)
      if (indexStatus) payload.append('index_status', indexStatus)
      if (imageFile) {
        payload.append('image', imageFile)
      } else if (coverUrl && !coverUrl.startsWith('blob:')) {
        payload.append('cover_url', coverUrl)
      }
      const r = post
        ? await updateBlogPost(post.id, payload)
        : await createBlogPost(payload)
      if (r?.status) onSaved(r.data)
      else setError(r?.message || 'Save failed')
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center
                    bg-black/70 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-3xl max-h-[90vh] flex flex-col
                      rounded-xl border border-white/10 bg-[#0e0e10]
                      shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center
                        justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">
            {post ? 'Edit post' : 'New blog post'}
          </h2>
          <label className="text-xs text-white/60 inline-flex items-center
                            gap-2 cursor-pointer">
            <input type="checkbox" checked={published}
                   onChange={(e) => setPub(e.target.checked)} />
            Published
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <Input label="Title" value={title} onChange={setTitle} />
          <div>
            <label className="block text-[11px] uppercase tracking-widest
                              font-bold text-white/40 mb-1.5">
              Excerpt
            </label>
            <textarea
              value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03]
                         border border-white/10 text-sm text-white
                         outline-none focus:border-brand-500/50 resize-none"
            />
          </div>
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-[11px] uppercase tracking-widest font-bold text-white/40">
                Content
              </label>
            </div>
            <JoditEditor content={content} setContent={setContent} />
          </div>
          <Input label="Tags (comma-separated)" value={tags} onChange={setTags} />
          
          <div>
            <label className="block text-[11px] uppercase tracking-widest font-bold text-white/40 mb-1.5">
              Featured Image
            </label>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                        setImageFile(file)
                        setCoverUrl(URL.createObjectURL(file))
                    }
                }}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white focus:border-brand-500/50 outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20"
            />
            {coverUrl && (
              <div className="mt-3 p-2 bg-white/[0.02] rounded-lg border border-white/5 inline-block relative group">
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/30 mb-2">Image Preview:</p>
                <img
                    src={coverUrl}
                    alt="Preview"
                    className="max-h-40 rounded object-cover border border-white/10"
                />
                <button
                    type="button"
                    onClick={() => { setCoverUrl(''); setImageFile(null); }}
                    className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Image"
                >
                    <XCircle size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
              <button
                  type="button"
                  onClick={() => setSeoOpen(!seoOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.04] transition group"
              >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-500/10 rounded-lg group-hover:bg-brand-500/20 transition">
                          <RefreshCw className="w-4 h-4 text-brand-500" />
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-tight">SEO Settings</h3>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 ${seoOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${seoOpen ? 'max-h-[800px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0'}`}>
                  <div className="p-5 space-y-4">
                      <Input label="Meta Title" value={metaTitle} onChange={setMetaTitle} />
                      
                      <div>
                        <label className="block text-[11px] uppercase tracking-widest font-bold text-white/40 mb-1.5">
                          Meta Description
                        </label>
                        <textarea
                          value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white outline-none focus:border-brand-500/50 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Meta Keywords" value={metaKw} onChange={setMetaKw} />
                        <Input label="Canonical URL" value={canonical} onChange={setCanonical} />
                      </div>

                      <div>
                          <label className="block text-[11px] uppercase tracking-widest font-bold text-white/40 mb-2">
                              Search Engine Indexing
                          </label>
                          <div className="flex gap-4 items-center">
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white">
                                  <input
                                      type="radio"
                                      name="index_status"
                                      value="index"
                                      checked={indexStatus === "index"}
                                      onChange={(e) => setIndex(e.target.value)}
                                      className="accent-brand-500"
                                  />
                                  Index (Show in search)
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white">
                                  <input
                                      type="radio"
                                      name="index_status"
                                      value="noindex"
                                      checked={indexStatus === "noindex"}
                                      onChange={(e) => setIndex(e.target.value)}
                                      className="accent-brand-500"
                                  />
                                  No-Index (Hide from search)
                              </label>
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-red-300 bg-red-500/10
                            border border-red-500/30 px-3 py-2 rounded-lg
                            flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy}
                  className="px-4 py-2 text-xs uppercase font-bold tracking-widest
                             text-white/60 hover:text-white">
            Cancel
          </button>
          <button onClick={submit}
                  disabled={busy || !title.trim() || content.length < 10}
                  className="px-4 py-2 text-xs uppercase font-bold tracking-widest
                             rounded-lg bg-brand-500 hover:bg-brand-400 text-black
                             inline-flex items-center gap-1.5
                             disabled:opacity-40 disabled:cursor-not-allowed">
            {busy && <Loader2 size={12} className="animate-spin" />}
            {post ? 'Save changes' : 'Publish post'}
          </button>
        </div>
      </div>
    </div>
  )
}
