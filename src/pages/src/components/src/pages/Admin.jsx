// src/pages/Admin.jsx — painel de administração de usuários
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { ArrowLeft, Plus, Trash2, Shield, ShieldOff, UserPlus } from 'lucide-react'

// super admins espelhados aqui só para exibição (não editáveis)
const SUPER_ADMINS = [
  'terciohzs@hotmail.com',
  'ravelmarinho@gmail.com',
]

export default function Admin({ role }) {
  const nav = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoRole, setNovoRole]   = useState('user')
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState('')

  const isSuperAdmin = role === 'superadmin'

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const snap = await getDocs(collection(db, 'usuarios_autorizados'))
    setUsuarios(snap.docs.map(d => ({ email: d.id, ...d.data() })))
    setLoading(false)
  }

  async function adicionar() {
    const email = novoEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setMsg('E-mail inválido.'); return }
    if (SUPER_ADMINS.includes(email)) { setMsg('Super admins não precisam ser cadastrados.'); return }
    setSalvando(true)
    await setDoc(doc(db, 'usuarios_autorizados', email), {
      role: novoRole,
      adicionadoEm: serverTimestamp(),
    })
    setNovoEmail(''); setMsg(`✅ ${email} adicionado como ${novoRole === 'admin' ? 'Admin' : 'Usuário'}.`)
    await carregar()
    setSalvando(false)
  }

  async function remover(email) {
    if (!confirm(`Remover acesso de ${email}?`)) return
    await deleteDoc(doc(db, 'usuarios_autorizados', email))
    setMsg(`🗑️ ${email} removido.`)
    await carregar()
  }

  async function alterarRole(email, novoR) {
    await setDoc(doc(db, 'usuarios_autorizados', email), { role: novoR }, { merge: true })
    setMsg(`✅ ${email} agora é ${novoR === 'admin' ? 'Admin' : 'Usuário'}.`)
    await carregar()
  }

  const roleLabel = (r) => r === 'admin' ? 'Admin' : 'Usuário'
  const roleTone  = (r) => r === 'admin' ? 'warn' : 'neutral'

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav('/')} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex:1 }}>
          <h1>Gerenciar Usuários</h1>
          <p className="text-sub">Controle quem acessa o sistema</p>
        </div>
      </div>

      {/* Super admins (fixos) */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="flex-center gap-10" style={{ marginBottom:12 }}>
          <div className="section-icon"><Shield size={16} /></div>
          <h2>Super Admins</h2>
          <span className="tag tag-warn" style={{ marginLeft:'auto' }}>Fixos no código</span>
        </div>
        <div style={{ display:'grid', gap:8 }}>
          {SUPER_ADMINS.map(email => (
            <div key={email} className="flex-center gap-10"
              style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'#FFF3CD', color:'var(--warn)', display:'grid', placeItems:'center' }}>
                <Shield size={16} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{email}</div>
                <div className="text-sub" style={{ fontSize:12 }}>Super Admin — não pode ser removido</div>
              </div>
              <span className="tag tag-warn">Super Admin</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usuários cadastrados */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="flex-center gap-10" style={{ marginBottom:12 }}>
          <div className="section-icon"><UserPlus size={16} /></div>
          <h2>Usuários autorizados</h2>
          <span className="tag tag-neutral" style={{ marginLeft:'auto' }}>{usuarios.length} cadastrado{usuarios.length !== 1 ? 's' : ''}</span>
        </div>

        {loading && <div style={{ textAlign:'center', padding:24 }}><span className="spinner" /></div>}

        {!loading && usuarios.length === 0 && (
          <p className="text-sub" style={{ textAlign:'center', padding:16 }}>Nenhum usuário cadastrado ainda.</p>
        )}

        <div style={{ display:'grid', gap:8 }}>
          {usuarios.map(u => (
            <div key={u.email} className="flex-center gap-10"
              style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:10 }}>
              <div className="avatar" style={{ width:34, height:34, fontSize:14 }}>
                {u.email[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{u.email}</div>
                <div className="text-sub" style={{ fontSize:12 }}>{roleLabel(u.role)}</div>
              </div>

              {/* Alterar role — só super admin pode promover/rebaixar */}
              {isSuperAdmin && (
                u.role === 'admin'
                  ? (
                    <button className="btn-ghost" style={{ padding:'6px 10px', fontSize:12 }}
                      onClick={() => alterarRole(u.email, 'user')} title="Rebaixar para Usuário">
                      <ShieldOff size={14} /> Rebaixar
                    </button>
                  ) : (
                    <button className="btn-ghost" style={{ padding:'6px 10px', fontSize:12 }}
                      onClick={() => alterarRole(u.email, 'admin')} title="Promover a Admin">
                      <Shield size={14} /> Tornar Admin
                    </button>
                  )
              )}

              <span className={`tag tag-${roleTone(u.role)}`}>{roleLabel(u.role)}</span>

              <button className="btn-danger" style={{ padding:'6px 10px' }}
                onClick={() => remover(u.email)} title="Remover acesso">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar novo usuário */}
      <div className="card">
        <div className="flex-center gap-10" style={{ marginBottom:14 }}>
          <div className="section-icon"><Plus size={16} /></div>
          <h2>Adicionar acesso</h2>
        </div>

        <div className="grid-2" style={{ marginBottom:12 }}>
          <label>
            <span className="lbl">E-mail Google</span>
            <input className="inp" type="email" placeholder="colega@gmail.com"
              value={novoEmail} onChange={e => { setNovoEmail(e.target.value); setMsg('') }} />
          </label>
          <label>
            <span className="lbl">Nível de acesso</span>
            <select className="inp" value={novoRole} onChange={e => setNovoRole(e.target.value)}>
              <option value="user">Usuário — acessa o app</option>
              {isSuperAdmin && <option value="admin">Admin — gerencia usuários</option>}
            </select>
          </label>
        </div>

        <button className="btn-primary" onClick={adicionar} disabled={salvando || !novoEmail}>
          {salvando ? <span className="spinner" /> : <><Plus size={15} /> Adicionar</>}
        </button>

        {msg && (
          <div style={{ marginTop:12, padding:'10px 14px',
            background: msg.startsWith('✅') ? 'var(--good-bg)' : msg.startsWith('🗑️') ? 'var(--bg)' : 'var(--bad-bg)',
            color: msg.startsWith('✅') ? 'var(--good)' : msg.startsWith('🗑️') ? 'var(--sub)' : 'var(--bad)',
            borderRadius:10, fontSize:13 }}>
            {msg}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop:14, background:'var(--bg)', border:'none' }}>
        <p className="text-sub" style={{ fontSize:12.5, lineHeight:1.6 }}>
          <b>Como funciona:</b> apenas e-mails cadastrados aqui conseguem fazer login.
          Admins podem adicionar e remover usuários comuns.
          Super Admins podem promover usuários a Admin.
          Os super admins ({SUPER_ADMINS.join(', ')}) são fixos e nunca podem ser removidos pelo app.
        </p>
      </div>
    </>
  )
}
