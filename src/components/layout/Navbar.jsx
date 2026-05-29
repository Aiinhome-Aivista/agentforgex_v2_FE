import { Link, useNavigate } from 'react-router-dom'
import { Zap, BookOpen, LayoutTemplate, ShoppingBag, LogOut, UserCircle2, Sparkles, Layers, Newspaper, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/signin')
  }

  const planLabel = user?.plan
    ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
    : null

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2.5 font-bold tracking-tight text-white group">
          <span className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center group-hover:bg-brand-400 transition-colors">
            <Zap size={16} className="text-black" fill="black" />
          </span>
          AgentForgeX
        </Link>
        <div className="flex items-center gap-1">
          {/* <NavLink href="#" icon={<BookOpen size={14} />}>Documentation</NavLink> */}
          {/* <NavLink href="#" icon={<LayoutTemplate size={14} />}>Templates</NavLink>
          <NavLink href="#" icon={<ShoppingBag size={14} />}>Marketplace</NavLink> */}
          <Link to="/workspaces" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <Layers size={14} />Workspaces
          </Link>
          {/* <Link to="/blog" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <Newspaper size={14} />Blogs
          </Link> */}
          {user?.is_admin ? (
            <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded-lg transition-all">
              <Shield size={14} />Admin
            </Link>
          ) : null}
        </div>
        
        <div className="flex items-center gap-4">
          <h1 className='font-semibold text-brand-500 text-sm hidden sm:block'>
            Welcome {user?.name}
          </h1>



          {/* <Link
            to="/account"
            title="Account"
            className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <UserCircle2 size={18} />
          </Link> */}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 p-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, icon, children }) {
  return (
    <a href={href} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/50
       hover:text-white hover:bg-white/5 rounded-lg transition-all">
      {icon}{children}
    </a>
  )
}
