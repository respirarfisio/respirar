// src/pages/Pacientes.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, ChevronRight, Search } from 'lucide-react'
import { listarPacientes, listarAvaliacoes } from '../utils/db'

export default function Pacientes() {
  const nav = useNavigate()
  const [pacientes, setPacientes] = useState([])
  const [counts, setCounts] = useState({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarPacientes()
      .then(async lista => {
        setPacientes(lista)
        const c = {}
        await Promise.all(lista.map(async p => {
          const avs = await listarAvaliacoes(p.id)
          c[p.id] = avs.length
        }))
        setCounts(c)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtrados = query.trim()
    ? pacientes.filter(p => p.nome.toLowerCase().includes(query.toLowerCase()))
    : pacientes

  return (
    <>
      {/* Header */}
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h1>Pacientes</h1>
          <p className="text-sub">{pacientes.length} cadastrado{pacientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => nav('/paciente/novo')}>
          <Plus size={16} /> Novo paciente
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--sub)' }} />
        <input
          className="inp"
          style={{ paddingLeft: 38 }}
          placeholder="Buscar por nome"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>}

      {!loading && filtrados.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--teal-light)', color: 'var(--teal-dark)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <Users size={28} />
          </div>
          <h2 style={{ marginBottom: 4 }}>
            {pacientes.length ? 'Nenhum paciente encontrado' : 'Comece cadastrando um paciente'}
          </h2>
          <p className="text-sub">
            {pacientes.length ? 'Ajuste a busca.' : 'Cada paciente guarda suas avaliações e evolução.'}
          </p>
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtrados.map(p => (
            <button key={p.id} className="row-card" onClick={() => nav(`/paciente/${p.id}`)}>
              <div className="avatar">{p.nome[0].toUpperCase()}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 650, color: 'var(--ink)' }}>{p.nome}</div>
                <div className="text-sub">
                  {p.sexo === 'M' ? 'Masculino' : 'Feminino'} · {p.idade} anos · {counts[p.id] ?? 0} {counts[p.id] === 1 ? 'avaliação' : 'avaliações'}
                </div>
              </div>
              <ChevronRight size={18} color="var(--sub)" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
