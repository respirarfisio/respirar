// src/components/Layout.jsx
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Settings, BarChart3, CalendarDays, Menu, X, DollarSign, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

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

const btnStyle = {
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(255,255,255,.15)',
  borderRadius: 8,
  color: '#9FB0C9',
  padding: '8px 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

export default function Layout({ user, role, logout }) {
  const nav = useNavigate()
  const isAdmin = role === 'admin' || role === 'superadmin'
  const [menuOpen, setMenuOpen] = useState(false)
  const online = useOnlineStatus()

  const navItems = [
    { label: 'Dashboard', icon: <BarChart3 size={15} />, path: '/dashboard' },
    { label: 'Financeiro', icon: <DollarSign size={15} />, path: '/dashboard-financeiro' },
    { label: 'Agenda',    icon: <CalendarDays size={15} />, path: '/agenda' },
    ...(isAdmin ? [{ label: 'Admin', icon: <Settings size={15} />, path: '/admin' }] : []),
  ]

  return (
    <div>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar no-print">
        {/* Logo */}
        <button onClick={() => { nav('/'); setMenuOpen(false) }}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10, padding:0, flexShrink:0 }}>
          <LungIcon />
          <div>
            <div className="topbar-logo">re<span>spir</span>ar</div>
            <div className="topbar-tagline">FISIOTERAPEUTAS</div>
          </div>
        </button>

        {/* Desktop nav — some no mobile */}
        <div className="topbar-desktop-nav">
          {navItems.map(item => (
            <button key={item.path} style={btnStyle} onClick={() => nav(item.path)}>
              {item.icon} {item.label}
            </button>
          ))}
          {user?.photoURL && (
            <img src={user.photoURL} alt={user.displayName}
              style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)', flexShrink:0 }} />
          )}
          <button style={btnStyle} onClick={logout} title="Sair">
            <LogOut size={14} /> Sair
          </button>
        </div>

        {/* Mobile — hamburguer */}
        <button className="topbar-mobile-menu"
          style={{ ...btnStyle, marginLeft:'auto' }}
          onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── Menu mobile dropdown ────────────────────────────────────── */}
      {menuOpen && (
        <div className="mobile-menu no-print">
          {navItems.map(item => (
            <button key={item.path} className="mobile-menu-item"
              onClick={() => { nav(item.path); setMenuOpen(false) }}>
              {item.icon} {item.label}
            </button>
          ))}
          <div style={{ height:1, background:'rgba(255,255,255,.1)', margin:'4px 0' }} />
          <button className="mobile-menu-item" onClick={() => { logout(); setMenuOpen(false) }}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      )}

      {/* ── Indicador offline ─────────────────────────────────────────── */}
      {!online && (
        <div className="no-print" style={{
          background: 'var(--warn)', color: '#fff', textAlign: 'center',
          padding: '7px 12px', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <WifiOff size={15} /> Sem conexão — as alterações serão salvas e sincronizadas quando a internet voltar.
        </div>
      )}

      {/* ── Conteúdo ────────────────────────────────────────────────── */}
      <div className="shell" style={{ paddingTop:22 }}>
        <Outlet context={{ user, role }} />
      </div>
    </div>
  )
}
