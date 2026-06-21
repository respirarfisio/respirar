// src/pages/Agenda.jsx — próximas visitas e alertas de reavaliação
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarClock, AlertTriangle, ChevronRight } from 'lucide-react'
import { listarPacientes, listarAvaliacoes, salvarPaciente } from '../utils/db'
import { fmtDate } from '../utils/avaliacao'

const DIAS_REAVALIACAO = 90

export default function Agenda() {
  const nav = useNavigate()
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const pacientes = await listarPacientes()
    const hoje = new Date()
    const rows = await Promise.all(pacientes.map(async p => {
      const avs = await listarAvaliacoes(p.id)
      const ultima = avs[0]?.data ?? null
      const diasDesde = ultima ? Math.floor((hoje - new Date(ultima)) / 86400000) : null
      return {
        paciente: p,
        ultima, diasDesde,
        precisaReavaliar: diasDesde != null && diasDesde >= DIAS_REAVALIACAO,
        proximaVisita: p.proximaVisita ?? '',
      }
    }))
    // ordena: reavaliação pendente primeiro, depois por próxima visita
    rows.sort((a, b) => {
      if (a.precisaReavaliar !== b.precisaReavaliar) return a.precisaReavaliar ? -1 : 1
      if (a.proximaVisita && b.proximaVisita) return a.proximaVisita.localeCompare(b.proximaVisita)
      if (a.proximaVisita) return -1
      if (b.proximaVisita) return 1
      return 0
    })
    setLinhas(rows)
    setLoading(false)
  }

  async function setProximaVisita(p, data) {
    await salvarPaciente({ ...p, proximaVisita: data })
    setLinhas(ls => ls.map(l => l.paciente.id === p.id ? { ...l, proximaVisita: data } : l))
  }

  const hojeISO = new Date().toISOString().slice(0, 10)

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  const alertas = linhas.filter(l => l.precisaReavaliar)
  const agendadas = linhas.filter(l => l.proximaVisita)

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav('/')} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Agenda</h1>
          <p className="text-sub">Visitas e reavaliações</p>
        </div>
      </div>

      {/* Alertas de reavaliação */}
      {alertas.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--warn)' }}>
          <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--warn-bg)', color: 'var(--warn)', display: 'grid', placeItems: 'center' }}>
              <AlertTriangle size={16} />
            </div>
            <h2>Reavaliações pendentes</h2>
            <span className="tag tag-warn" style={{ marginLeft: 'auto' }}>{alertas.length}</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {alertas.map(({ paciente: p, ultima, diasDesde }) => (
              <button key={p.id} className="row-card" onClick={() => nav(`/paciente/${p.id}`)}>
                <div className="avatar" style={{ background: 'var(--warn)' }}>{p.nome[0]}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 650 }}>{p.nome}</div>
                  <div className="text-sub">
                    Última avaliação: {fmtDate(ultima)} — há <b>{diasDesde} dias</b>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--sub)" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Próximas visitas agendadas */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
          <div className="section-icon"><CalendarClock size={16} /></div>
          <h2>Próximas visitas</h2>
        </div>
        {agendadas.length === 0 && (
          <p className="text-sub" style={{ padding: '8px 0' }}>Nenhuma visita agendada. Defina a data na lista abaixo.</p>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {agendadas.map(({ paciente: p, proximaVisita }) => {
            const atrasada = proximaVisita < hojeISO
            return (
              <button key={p.id} className="row-card" onClick={() => nav(`/paciente/${p.id}`)}>
                <div className="avatar">{p.nome[0]}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 650 }}>{p.nome}</div>
                  <div className="text-sub">Visita: {fmtDate(proximaVisita)}</div>
                </div>
                {atrasada && <span className="tag tag-bad">Atrasada</span>}
                {proximaVisita === hojeISO && <span className="tag tag-good">Hoje</span>}
                <ChevronRight size={18} color="var(--sub)" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Todos os pacientes — agendar */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Agendar visita</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {linhas.map(({ paciente: p, proximaVisita, ultima }) => (
            <div key={p.id} className="flex-center gap-10"
              style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                <div className="text-sub" style={{ fontSize: 12 }}>
                  {ultima ? `Última avaliação: ${fmtDate(ultima)}` : 'Sem avaliações'}
                </div>
              </div>
              <input className="inp" type="date" style={{ width: 160 }}
                value={proximaVisita}
                onChange={e => setProximaVisita(p, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
