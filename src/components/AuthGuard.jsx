// src/components/AuthGuard.jsx
// Protege todas as rotas — redireciona para login se não autenticado
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from '../firebase'

function LungSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
      <path d="M30 10v16c-4 2-9 1-13 6-5 6-5 18-3 24 2 5 9 4 12 0 3-4 4-9 4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M34 10v16c4 2 9 1 13 6 5 6 5 18 3 24-2 5-9 4-12 0-3-4-4-9-4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M22 24c4 0 8 2 10 5 2-3 6-5 10-5"
        stroke="#16233F" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  )
}

// Botão Google SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export function useAuth() {
  const [user, setUser]       = useState(undefined) // undefined = ainda carregando
  const [error, setError]     = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null))
    return unsub
  }, [])

  async function login() {
    setError('')
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      setError('Não foi possível fazer login. Tente novamente.')
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, login, logout, error }
}

// Tela de login
function LoginScreen({ login, error }) {
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    await login()
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(22,35,63,.10)',
        textAlign: 'center',
        maxWidth: 380,
        width: '90%',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <LungSVG />
        </div>
        <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 24, marginBottom: 4 }}>
          re<span style={{ color: 'var(--teal)' }}>spir</span>ar
        </div>
        <div style={{ color: '#9FB0C9', fontSize: 11, letterSpacing: 3, marginBottom: 32 }}>
          FISIOTERAPEUTAS
        </div>

        <div style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Bem-vindo
        </div>
        <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          Faça login com sua conta Google para acessar o sistema de avaliações.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            padding: '12px 20px',
            border: '1px solid #E3EAEF',
            borderRadius: 12,
            background: '#fff',
            color: 'var(--ink)',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background .15s',
            opacity: loading ? .6 : 1,
          }}
          onMouseOver={e => e.currentTarget.style.background = '#F3F6F8'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
        >
          {loading
            ? <span className="spinner" />
            : <><GoogleIcon /> Entrar com Google</>
          }
        </button>

        {error && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--bad-bg)', color: 'var(--bad)',
            borderRadius: 10, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <p style={{ color: 'var(--sub)', fontSize: 12, marginTop: 24 }}>
          Acesso restrito à equipe Respirar Fisioterapeutas.
        </p>
      </div>
    </div>
  )
}

// Guard — envolve toda a aplicação
export default function AuthGuard({ children }) {
  const { user, login, logout, error } = useAuth()

  // Ainda verificando sessão
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <span className="spinner" />
      </div>
    )
  }

  // Não logado
  if (!user) {
    return <LoginScreen login={login} error={error} />
  }

  // Logado — passa o logout para o Layout via contexto
  return children({ user, logout })
}
