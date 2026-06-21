// src/pages/Dashboard.jsx — visão geral da clínica
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, FileText, TrendingUp, CalendarClock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { listarPacientes, listarAvaliacoes } from '../utils/db'
import { num } from '../calc/referencias'

function StatCard({ icon: Icon, label, value, sub, tone = 'teal' }) {
  const bg = { teal: 'var(--teal-light)', navy: '#E8ECF4', good: 'var(--good-bg)', warn: 'var(--warn-bg)' }[tone]
  const fg = { teal: 'var(--teal-dark)', navy: 'var(--navy)', good: 'var(--good)', warn: 'var(--warn)' }[tone]
  return (
    <div className="card" style={{ flex: 1, minWidth: 150 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, color: fg, display: 'grid', placeItems: 'center', marginBottom: 10 }}>
        <Icon size={18} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-soft)' }}>{label}</div>
      {sub && <div className="text-sub" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    (async () => {
      const pacientes = await listarPacientes()
      const all = await Promise.all(pacientes.map(async p => ({
        paciente: p,
        avaliacoes: await listarAvaliacoes(p.id),
      })))

      const hoje = new Date()
      const mesAtual = hoje.toISOString().slice(0, 7)

      // Avaliações por mês (últimos 6 meses)
      const meses = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        meses[d.toISOString().slice(0, 7)] = 0
      }
      let totalAvs = 0, avsMes = 0
      all.forEach(({ avaliacoes }) => {
        avaliacoes.forEach(av => {
          totalAvs++
          const m = av.data?.slice(0, 7)
          if (m === mesAtual) avsMes++
          if (m in meses) meses[m]++
        })
      })

      // % melhorando — compara degrau (ou PImáx) das 2 últimas avaliações
      let comDuas = 0, melhorando = 0
      all.forEach(({ avaliacoes }) => {
        if (avaliacoes.length < 2) return
        const [atual, anterior] = avaliacoes // já vem desc
        const a = num(atual.degrau?.reps) ?? num(atual.pimax?.obtido)
        const b = num(anterior.degrau?.reps) ?? num(anterior.pimax?.obtido)
        if (a != null && b != null) {
          comDuas++
          if (a > b) melhorando++
        }
      })

      // Reavaliações pendentes (>90 dias)
      const pendentes = all.filter(({ avaliacoes }) => {
        if (!avaliacoes.length) return false
        const ultima = new Date(avaliacoes[0].data)
        return (hoje - ultima) / 86400000 >= 90
      }).length

      const mesLabel = (m) => {
        const [y, mm] = m.split('-')
        return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+mm - 1]
      }

      setStats({
        totalPacientes: pacientes.length,
        totalAvs, avsMes,
        pctMelhorando: comDuas ? Math.round((melhorando / comDuas) * 100) : null,
        comDuas,
        pendentes,
        chartMeses: Object.entries(meses).map(([m, v]) => ({ mes: mesLabel(m), avaliações: v })),
      })
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav('/')} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Dashboard</h1>
          <p className="text-sub">Visão geral da clínica</p>
        </div>
      </div>

      <div className="flex gap-12" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        <StatCard icon={Users} label="Pacientes" value={stats.totalPacientes} tone="teal" />
        <StatCard icon={FileText} label="Avaliações no mês" value={stats.avsMes} sub={`${stats.totalAvs} no total`} tone="navy" />
        <StatCard icon={TrendingUp} label="Melhorando"
          value={stats.pctMelhorando != null ? `${stats.pctMelhorando}%` : '—'}
          sub={stats.comDuas ? `de ${stats.comDuas} com 2+ avaliações` : 'precisa de 2+ avaliações'} tone="good" />
        <StatCard icon={CalendarClock} label="Reavaliações pendentes" value={stats.pendentes} sub="há mais de 90 dias" tone="warn" />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Avaliações por mês</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.chartMeses} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--sub)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--sub)' }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="avaliações" fill="var(--teal)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
