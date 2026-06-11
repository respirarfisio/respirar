// src/pages/Relatorio.jsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Pencil } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { getPaciente, getAvaliacao, listarAvaliacoes } from '../utils/db'
import {
  predPImax, predPEmax, predGrip, predStepReps,
  predSTS5, predSTS1, pct, r1, num,
} from '../calc/referencias'
import { fmtDate } from '../utils/avaliacao'

// ── Helpers ────────────────────────────────────────────────────────────────
function Tag({ tone = 'neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

function RepStat({ rows }) {
  return (
    <table className="rep-table">
      <thead>
        <tr><th>Variável</th><th>Obtido</th><th>Predito</th><th>% / Classificação</th></tr>
      </thead>
      <tbody>
        {rows.map(([name, obt, pred, pctVal, dir = 'high'], i) => {
          const good = dir === 'high' ? pctVal >= 100 : pctVal <= 100
          const tone = pctVal == null ? 'neutral' : (pctVal >= 80 ? 'good' : 'bad')
          return (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{name}</td>
              <td>{obt ?? '—'}</td>
              <td>{pred != null ? r1(pred) : '—'}</td>
              <td>{pctVal != null ? <Tag tone={tone}>{pctVal}% · {pctVal >= 80 ? 'Normal' : 'Reduzida'}</Tag> : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <div className="chart-card-title">{title}</div>
      <ResponsiveContainer width="100%" height={150}>{children}</ResponsiveContainer>
    </div>
  )
}

function Compare({ cur, prev }) {
  const rows = [
    ['Degrau (rep)',    num(cur.degrau?.reps),   num(prev.degrau?.reps),   'high'],
    ['PImáx (cmH₂O)',  num(cur.pimax?.obtido),   num(prev.pimax?.obtido),  'high'],
    ['Preensão (kgf)', num(cur.grip?.obtido),    num(prev.grip?.obtido),   'high'],
    ['TSL 5 rep (s)',  num(cur.sts5?.tempo),     num(prev.sts5?.tempo),    'low'],
  ].filter(r => r[1] != null && r[2] != null)

  if (!rows.length) return <p className="text-sub">Sem variáveis comparáveis entre as datas.</p>

  return (
    <table className="rep-table">
      <thead>
        <tr>
          <th>Variável</th>
          <th>{fmtDate(prev.data).slice(0, 5)}</th>
          <th>{fmtDate(cur.data).slice(0, 5)}</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, c, p, dir], i) => {
          const d = r1(c - p)
          const better = dir === 'high' ? d > 0 : d < 0
          return (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{name}</td>
              <td>{p}</td>
              <td>{c}</td>
              <td><Tag tone={d === 0 ? 'neutral' : better ? 'good' : 'warn'}>{d > 0 ? '+' : ''}{d}</Tag></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Logo SVG ───────────────────────────────────────────────────────────────
function LungIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      <path d="M30 10v16c-4 2-9 1-13 6-5 6-5 18-3 24 2 5 9 4 12 0 3-4 4-9 4-14V10z" stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M34 10v16c4 2 9 1 13 6 5 6 5 18 3 24-2 5-9 4-12 0-3-4-4-9-4-14V10z" stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M22 24c4 0 8 2 10 5 2-3 6-5 10-5" stroke="#16233F" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────
export default function Relatorio() {
  const { pid, aid } = useParams()
  const nav = useNavigate()
  const reportRef = useRef()

  const [paciente, setPaciente] = useState(null)
  const [ev, setEv] = useState(null)
  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPaciente(pid), getAvaliacao(pid, aid), listarAvaliacoes(pid)])
      .then(([p, a, avs]) => {
        setPaciente(p)
        setEv(a)
        const anterior = avs
          .filter(x => x.id !== aid && x.data < a.data)
          .sort((a, b) => b.data.localeCompare(a.data))[0]
        setPrev(anterior ?? null)
      })
      .finally(() => setLoading(false))
  }, [pid, aid])

  async function handlePDF() {
    const { default: html2pdf } = await import('html2pdf.js')
    html2pdf()
      .set({
        margin: [10, 10],
        filename: `relatorio-${paciente.nome.replace(/\s+/g, '-')}-${ev.data}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(reportRef.current)
      .save()
  }

  if (loading || !ev || !paciente) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  const idade = paciente.idade, sexo = paciente.sexo, peso = num(paciente.peso)
  const pimP  = num(ev.pimax?.predito)  ?? r1(predPImax(idade, sexo))
  const pemP  = num(ev.pemax?.predito)  ?? r1(predPEmax(idade, sexo))
  const grP   = num(ev.grip?.predito)   ?? r1(predGrip(idade, peso, sexo))
  const repsP = num(ev.degrau?.preditoReps) ?? r1(predStepReps(idade, sexo))
  const sts5P = num(ev.sts5?.predito)   ?? predSTS5(idade)
  const sts1P = num(ev.sts1?.predito)   ?? predSTS1(idade, sexo)

  const pim  = num(ev.pimax?.obtido)
  const pem  = num(ev.pemax?.obtido)
  const gr   = num(ev.grip?.obtido)
  const reps = num(ev.degrau?.reps)
  const sts5 = num(ev.sts5?.tempo)
  const sts1 = num(ev.sts1?.reps)

  const chartData = (ev.degrau?.serie ?? []).map(s => ({
    t: s.t, FC: num(s.fc), SpO2: num(s.spo2), PAS: num(s.pas), PAD: num(s.pad), BORG: num(s.borg),
  }))
  const hasChart = chartData.some(d => d.FC != null)

  return (
    <>
      {/* Controles (não imprimem) */}
      <div className="no-print flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1>Relatório</h1>
          <p className="text-sub">{paciente.nome} · {fmtDate(ev.data)}</p>
        </div>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}/avaliacao/${aid}`)}>
          <Pencil size={15} /> Editar
        </button>
        <button className="btn-primary" onClick={handlePDF}>
          <Printer size={16} /> Exportar PDF
        </button>
      </div>

      {/* Relatório */}
      <div className="report" ref={reportRef}>

        {/* Capa */}
        <div className="rep-head">
          <LungIcon />
          <div>
            <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 18 }}>Relatório Fisioterapêutico</div>
            <div style={{ color: 'var(--teal-dark)', fontWeight: 700, fontSize: 13, letterSpacing: .5 }}>
              {paciente.nome.toUpperCase()}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12, color: 'var(--sub)' }}>
            AV: {fmtDate(ev.data)}
          </div>
        </div>

        {/* Identificação */}
        <div className="rep-id">
          {[
            ['Paciente', paciente.nome],
            ['Sexo', sexo === 'M' ? 'Masculino' : 'Feminino'],
            ['Idade', `${idade} anos`],
            ['Médico', ev.medico || paciente.medico || '—'],
            ['Objetivo', ev.objetivo || '—'],
          ].map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>

        {/* Visão geral */}
        {paciente.historico && (
          <div className="rep-block">
            <div className="rep-h">Visão geral</div>
            <p style={{ lineHeight: 1.55 }}>{paciente.historico}</p>
          </div>
        )}

        {/* Teste do Degrau */}
        <div className="rep-block">
          <div className="rep-h">Teste do degrau de 6 min</div>
          <RepStat rows={[
            ['Repetições', reps ? `${reps} rep` : '—', repsP, reps && repsP ? pct(reps, repsP) : null, 'high'],
            ['FC máx', ev.degrau?.fcMax ? `${ev.degrau.fcMax} bpm` : '—', null, null],
            ['FC rec. 1 min', ev.degrau?.fcRec1 ? `${ev.degrau.fcRec1} bpm` : '—', null, null],
            ['FC rec. 3 min', ev.degrau?.fcRec3 ? `${ev.degrau.fcRec3} bpm` : '—', null, null],
            ['BORG máx', ev.degrau?.borgMax || '—', null, null],
          ]} />

          {hasChart && (
            <div className="charts-grid no-break">
              <ChartCard title="FC e SpO₂">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line dataKey="FC"   stroke="var(--bad)"  strokeWidth={2} dot={{ r: 2 }} />
                  <Line dataKey="SpO2" stroke="var(--good)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartCard>
              <ChartCard title="PAS e PAD">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line dataKey="PAS" stroke="var(--good)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line dataKey="PAD" stroke="var(--bad)"  strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartCard>
              <ChartCard title="BORG">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="BORG" fill="var(--teal)" radius={[3,3,0,0]} />
                </BarChart>
              </ChartCard>
            </div>
          )}

          {ev.degrau?.obs && <p style={{ marginTop: 10, lineHeight: 1.5 }}>{ev.degrau.obs}</p>}
        </div>

        {/* Respiratória */}
        <div className="rep-block no-break">
          <div className="rep-h">Função muscular respiratória</div>
          <RepStat rows={[
            ['PImáx', pim ? `${pim} cmH₂O` : '—', pimP, pim && pimP ? pct(pim, pimP) : null],
            ['PEmáx', pem ? `${pem} cmH₂O` : '—', pemP, pem && pemP ? pct(pem, pemP) : null],
          ]} />
        </div>

        {/* Periférica */}
        <div className="rep-block no-break">
          <div className="rep-h">Função muscular periférica</div>
          <RepStat rows={[
            ['Preensão palmar', gr ? `${gr} kgf` : '—', grP, gr && grP ? pct(gr, grP) : null],
            ['TSL 1 min',       sts1 ? `${sts1} rep` : '—', sts1P, sts1 && sts1P ? pct(sts1, sts1P) : null],
          ]} />
          {sts5 != null && (
            <div className="flex-center gap-8 mt-8">
              <span>TSL 5 rep: <b>{sts5} s</b> (predito {sts5P} s)</span>
              <Tag tone={sts5 <= sts5P ? 'good' : 'bad'}>
                Risco de queda {sts5 <= sts5P ? 'Diminuído' : 'Aumentado'}
              </Tag>
            </div>
          )}
        </div>

        {/* Comparativo */}
        {prev && (
          <div className="rep-block no-break">
            <div className="rep-h">Comparativo com avaliação anterior ({fmtDate(prev.data)})</div>
            <Compare cur={ev} prev={prev} />
          </div>
        )}

        {/* Conclusão */}
        {ev.conclusao && (
          <div className="rep-block">
            <div className="rep-h">Conclusões</div>
            <p style={{ lineHeight: 1.6 }}>{ev.conclusao}</p>
          </div>
        )}

        {/* Assinatura */}
        <div className="rep-sign">
          <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 13 }}>{ev.profissional}</div>
          <div className="text-sub" style={{ marginTop: 4 }}>
            Av. Hermes da Fonseca, 390 — Lj 05 · Petrópolis, Natal/RN · (84) 9 9168-8285
          </div>
        </div>

      </div>
    </>
  )
}
