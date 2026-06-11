// src/components/Layout.jsx
import { Outlet } from 'react-router-dom'

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

export default function Layout() {
  return (
    <div>
      <div className="topbar">
        <LungIcon />
        <div>
          <div className="topbar-logo">re<span>spir</span>ar</div>
          <div className="topbar-tagline">FISIOTERAPEUTAS</div>
        </div>
      </div>
      <div className="shell" style={{ paddingTop: 22 }}>
        <Outlet />
      </div>
    </div>
  )
}
