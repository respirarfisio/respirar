// src/components/Layout.jsx
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'

function LungIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
      <path d="M30 10v16c-4 2-9 1-13 6-5 6-5 18-3 24 2 5 9 4 12 0 3-4 4-9 4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M34 10v16c4 2 9 1 13 6 5 6 5 18 3 24-2 5-9 4-12 0-3-4-4-9-4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M22 24c4 0 8 2 10 5 2-3 6-5 10-5"
        stroke="#16233F" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  )
}

export default function Layout({ user, role, logout }) {
  const nav = useNavigate()
  const isAdmin = role === 'admin' || role === 'superadmin'

  return (
    <div>
      <div className="topbar no-print">
        <button onClick={() => nav('/')}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, padding:0 }}>
          <LungIcon />
          <div>
            <div className="topbar-logo">re<span>spir</span>ar</div>
            <div className="topbar-tagline">FISIOTERAPEUTAS</div>
          </div>
        </button>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {user?.photoURL && (
            <img src={user.photoURL} alt={user.displayName}
              style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)' }} />
          )}

          {/* Botão admin — só aparece para admins */}
          {isAdmin && (
            <button onClick={() => nav('/admin')} title="Gerenciar usuários"
              style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, color:'#9FB0C9', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit' }}>
              <Settings size={14} /> Admin
            </button>
          )}

          <button onClick={logout} title="Sair"
            style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:8, color:'#9FB0C9', padding:'6px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:'inherit' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div className="shell" style={{ paddingTop:22 }}>
        <Outlet context={{ user, role }} />
      </div>
    </div>
  )
}
