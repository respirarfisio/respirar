// src/pages/Relatorio.jsx — relatório completo no padrão Respirar
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Pencil, Sparkles } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getPaciente, getAvaliacao, listarAvaliacoes } from '../utils/db'
import {
  predPImax, predPEmax, predGrip, predStepReps,
  predSTS5, predSTS1, calcIMC, classIMC, fcMaxTanaka,
  num, r1, pct,
} from '../calc/referencias'
import { fmtDate, borgLabel } from '../utils/avaliacao'

// ─── UI helpers ──────────────────────────────────────────────────────────
function Tag({ tone='neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

function RepH({ children }) {
  return <div className="rep-h">{children}</div>
}

function RepTable({ rows }) {
  return (
    <table className="rep-table">
      <thead><tr><th>Variável</th><th>Obtido</th><th>Predito</th><th>% / Classificação</th></tr></thead>
      <tbody>
        {rows.map(([name, obt, pred, pctVal], i) => {
          const tone = pctVal == null ? 'neutral' : pctVal >= 80 ? 'good' : 'bad'
          return (
            <tr key={i}>
              <td style={{ fontWeight:600 }}>{name}</td>
              <td>{obt ?? '—'}</td>
              <td>{pred != null ? r1(pred) : '—'}</td>
              <td>{pctVal != null
                ? <Tag tone={tone}>{pctVal}% · {pctVal >= 80 ? 'Normal' : 'Reduzida'}</Tag>
                : '—'}
              </td>
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

function LungSVG() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
      <path d="M30 10v16c-4 2-9 1-13 6-5 6-5 18-3 24 2 5 9 4 12 0 3-4 4-9 4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M34 10v16c4 2 9 1 13 6 5 6 5 18 3 24-2 5-9 4-12 0-3-4-4-9-4-14V10z"
        stroke="#15B8C4" strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M22 24c4 0 8 2 10 5 2-3 6-5 10-5"
        stroke="#16233F" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Chave Groq — coloque aqui a sua chave do console.groq.com/keys ──────
const GROQ_API_KEY = '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'
const GROQ_MODEL   = 'llama3-70b-8192'

async function chamarGroq(prompt, maxTokens = 1000) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: 'Você é um fisioterapeuta cardiorrespiratório experiente da clínica Respirar Fisioterapeutas (Natal/RN). Escreva sempre em português formal, no estilo de relatórios fisioterapêuticos profissionais brasileiros.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Erro Groq: ${response.status}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? 'Não foi possível gerar o texto.'
}

// ─── Geração de conclusão via Groq ───────────────────────────────────────
async function gerarConclusaoIA(paciente, ev, calc) {
  const prompt = `Com base nos dados de avaliação abaixo, redija uma conclusão clínica fisioterapêutica.

Paciente: ${paciente.nome}, ${paciente.sexo === 'M' ? 'masculino' : 'feminino'}, ${paciente.idade} anos.
Histórico clínico: ${paciente.historico || 'não informado'}.
Objetivo da avaliação: ${ev.objetivo || 'avaliação funcional'}.

Resultados obtidos:
- Teste do degrau 6 min: ${calc.reps ?? '—'} rep (${calc.repsPct ?? '—'}% do predito de ${r1(calc.repsP)} rep)
- FC máx: ${ev.degrau?.fcMax ?? '—'} bpm | FC rec 1 min: ${ev.degrau?.fcRec1 ?? '—'} bpm | FC rec 3 min: ${ev.degrau?.fcRec3 ?? '—'} bpm
- BORG máx: ${ev.degrau?.borgMax ?? '—'}
- PImáx: ${calc.pim ?? '—'} cmH₂O (${calc.pimPct ?? '—'}% do predito de ${r1(calc.pimP)})
- PEmáx: ${calc.pem ?? '—'} cmH₂O (${calc.pemPct ?? '—'}% do predito de ${r1(calc.pemP)})
- Preensão palmar: ${calc.grip ?? '—'} kgf (${calc.gripPct ?? '—'}% do predito de ${r1(calc.grP)})
- TSL 5 rep: ${calc.sts5 ?? '—'} s (predito < ${calc.sts5P ?? '—'} s) — risco de queda: ${calc.sts5Risk ?? '—'}
- TSL 1 min: ${calc.sts1 ?? '—'} rep (${calc.sts1Pct ?? '—'}% do predito de ${calc.sts1P})

A conclusão deve:
1. Sintetizar os achados principais (capacidade funcional, função respiratória, força muscular periférica)
2. Interpretar clinicamente os resultados alterados
3. Contextualizar as alterações no histórico clínico do paciente
4. Recomendar abordagem terapêutica baseada em evidências (treinamento neuromuscular, aeróbio, TMI se indicado)
5. Mencionar meta de ≥150 min/semana de atividade física supervisionada conforme OMS, AHA, ACSM e SBC
6. Encerrar com "Sigo à disposição."

Escreva apenas o texto da conclusão, em 3 parágrafos, sem títulos ou marcadores.`

  return chamarGroq(prompt, 1000)
}

// ─── Geração de comparativo via Groq ─────────────────────────────────────
async function gerarComparativoIA(paciente, cur, prev, calcCur, calcPrev) {
  const prompt = `Compare as duas avaliações fisioterapêuticas do paciente ${paciente.nome} (${paciente.idade} anos) e redija um parágrafo clínico sobre a evolução entre as datas.

Avaliação anterior — ${fmtDate(prev.data)}:
- Teste do degrau: ${calcPrev.reps ?? '—'} rep (${calcPrev.repsPct ?? '—'}% do predito)
- PImáx: ${calcPrev.pim ?? '—'} cmH₂O (${calcPrev.pimPct ?? '—'}%)
- Preensão palmar: ${calcPrev.grip ?? '—'} kgf (${calcPrev.gripPct ?? '—'}%)
- TSL 5 rep: ${calcPrev.sts5 ?? '—'} s

Avaliação atual — ${fmtDate(cur.data)}:
- Teste do degrau: ${calcCur.reps ?? '—'} rep (${calcCur.repsPct ?? '—'}% do predito)
- PImáx: ${calcCur.pim ?? '—'} cmH₂O (${calcCur.pimPct ?? '—'}%)
- Preensão palmar: ${calcCur.grip ?? '—'} kgf (${calcCur.gripPct ?? '—'}%)
- TSL 5 rep: ${calcCur.sts5 ?? '—'} s

Escreva apenas 1 parágrafo interpretando clinicamente a evolução, destacando melhoras, pioras ou manutenção dos resultados, e o que isso representa para o prognóstico e conduta do paciente. Sem título.`

  return chamarGroq(prompt, 600)
}

function calcEv(ev, paciente) {
  const idade = paciente.idade, sexo = paciente.sexo
  const peso = num(ev.vitais?.peso) || num(paciente.peso)
  const altura = num(ev.vitais?.altura) || num(paciente.altura)

  const pimP  = num(ev.pimax?.predito)  ?? r1(predPImax(idade, sexo))
  const pemP  = num(ev.pemax?.predito)  ?? r1(predPEmax(idade, sexo))
  const grP   = num(ev.grip?.predito)   ?? r1(predGrip(idade, peso, sexo))
  const repsP = num(ev.degrau?.preditoReps) ?? r1(predStepReps(idade, sexo))
  const sts5P = num(ev.sts5?.predito)   ?? predSTS5(idade)
  const sts1P = num(ev.sts1?.predito)   ?? predSTS1(idade, sexo)

  const pim  = num(ev.pimax?.obtido)
  const pem  = num(ev.pemax?.obtido)
  const grip = num(ev.grip?.obtido)
  const reps = num(ev.degrau?.reps)
  const sts5 = num(ev.sts5?.tempo)
  const sts1 = num(ev.sts1?.reps)

  return {
    pim, pimP, pimPct: pct(pim, pimP),
    pem, pemP, pemPct: pct(pem, pemP),
    grip, grP, gripPct: pct(grip, grP),
    reps, repsP, repsPct: pct(reps, repsP),
    sts5, sts5P, sts5Risk: sts5 == null ? null : sts5 <= sts5P ? 'Diminuído' : 'Aumentado',
    sts1, sts1P, sts1Pct: pct(sts1, sts1P),
  }
}

// ─── Página ──────────────────────────────────────────────────────────────
export default function Relatorio() {
  const { pid, aid } = useParams()
  const nav = useNavigate()
  const reportRef = useRef()

  const [paciente, setPaciente] = useState(null)
  const [ev, setEv] = useState(null)
  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [gerandoComp, setGerandoComp] = useState(false)
  const [comparativoIA, setComparativoIA] = useState('')

  useEffect(() => {
    Promise.all([getPaciente(pid), getAvaliacao(pid, aid), listarAvaliacoes(pid)])
      .then(([p, a, avs]) => {
        setPaciente(p); setEv({ ...a })
        const ant = avs.filter(x => x.id !== aid && x.data < a.data)
          .sort((a, b) => b.data.localeCompare(a.data))[0]
        setPrev(ant ?? null)
      }).finally(() => setLoading(false))
  }, [pid, aid])

  const handleGerarIA = useCallback(async () => {
    if (!paciente || !ev) return
    setGerando(true)
    try {
      const calc = calcEv(ev, paciente)
      const texto = await gerarConclusaoIA(paciente, ev, calc)
      setEv(cur => ({ ...cur, conclusaoIA: texto }))
    } catch(e) { alert('Erro ao chamar IA: ' + e.message) }
    finally { setGerando(false) }
  }, [paciente, ev])

  const handleGerarComparativo = useCallback(async () => {
    if (!prev) return
    setGerandoComp(true)
    try {
      const calcCur  = calcEv(ev, paciente)
      const calcPrev = calcEv(prev, paciente)
      const texto = await gerarComparativoIA(paciente, ev, prev, calcCur, calcPrev)
      setComparativoIA(texto)
    } catch(e) { alert('Erro: ' + e.message) }
    finally { setGerandoComp(false) }
  }, [paciente, ev, prev])

  function handlePDF() {
    window.print()
  }

  if (loading || !ev || !paciente) return <div style={{ textAlign:'center', padding:48 }}><span className="spinner" /></div>

  const calc = calcEv(ev, paciente)
  const { pim, pimP, pimPct, pem, pemP, pemPct, grip, grP, gripPct,
    reps, repsP, repsPct, sts5, sts5P, sts5Risk, sts1, sts1P, sts1Pct } = calc

  const idade = paciente.idade, sexo = paciente.sexo
  const peso = num(ev.vitais?.peso) || num(paciente.peso)
  const altura = num(ev.vitais?.altura) || num(paciente.altura)
  const imc = calcIMC(peso, altura)

  const chartData = (ev.degrau?.serie ?? []).map(s => ({
    t: s.t, FC: num(s.fc), SpO2: num(s.spo2),
    PAS: num(s.pas), PAD: num(s.pad),
    BORG: num(s.borg), PSE: num(s.pse),
  }))
  const hasChart = chartData.some(d => d.FC != null)

  const fcRec1 = num(ev.degrau?.fcRec1)
  const fcRec3 = num(ev.degrau?.fcRec3)
  const fcMax  = num(ev.degrau?.fcMax)
  const deltaRec1 = fcMax && fcRec1 ? fcMax - fcRec1 : null
  const deltaRec3 = fcMax && fcRec3 ? fcMax - fcRec3 : null

  // Dados vitais formatados
  const v = ev.vitais ?? {}

  return (
    <>
      {/* Controles — não imprimem */}
      <div className="no-print flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex:1 }}>
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

      {/* ══════════════════════════════════════════════════════════════════
          RELATÓRIO (tudo abaixo vai para o PDF)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="report" ref={reportRef}>

        {/* CAPA */}
        <div style={{ textAlign:'center', padding:'32px 0 24px', borderBottom:'3px solid var(--teal)', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><LungSVG /></div>
          <div style={{ fontWeight:800, color:'var(--navy)', fontSize:22, letterSpacing:.3 }}>
            re<span style={{ color:'var(--teal)' }}>spir</span>ar
          </div>
          <div style={{ color:'#9FB0C9', fontSize:11, letterSpacing:3, marginBottom:16 }}>FISIOTERAPEUTAS</div>
          <div style={{ fontWeight:700, color:'var(--navy)', fontSize:18 }}>Relatório Fisioterapêutico</div>
          <div style={{ color:'var(--teal-dark)', fontWeight:700, fontSize:14, marginTop:6, letterSpacing:.5 }}>
            {paciente.nome.toUpperCase()}
          </div>
        </div>

        {/* IDENTIFICAÇÃO */}
        <div className="rep-block">
          <RepH>Identificação</RepH>
          <div className="rep-id">
            {[
              ['AV', fmtDate(ev.data)],
              ['Paciente', paciente.nome],
              ['Sexo', sexo === 'M' ? 'Masculino' : 'Feminino'],
              ['Idade', `${idade} anos`],
              ['Médico', ev.medico || paciente.medico || '—'],
              ['Objetivo', ev.objetivo || '—'],
            ].map(([k,v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
        </div>

        {/* DADOS VITAIS */}
        {(v.fc || v.pas || v.spo2 || peso) && (
          <div className="rep-block no-break">
            <RepH>Dados Vitais</RepH>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>FC (bpm)</th><th>FR (ipm)</th><th>PA (mmHg)</th>
                  <th>SpO₂ (%)</th><th>Peso (kg)</th><th>Altura (cm)</th>
                  <th>IMC</th><th>Classificação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{v.fc || '—'}</td>
                  <td>{v.fr || '—'}</td>
                  <td>{v.pas && v.pad ? `${v.pas}×${v.pad}` : '—'}</td>
                  <td>{v.spo2 || '—'}</td>
                  <td>{peso || '—'}</td>
                  <td>{altura || '—'}</td>
                  <td>{imc ?? '—'}</td>
                  <td>{classIMC(imc) || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* VISÃO GERAL */}
        <div className="rep-block">
          <RepH>Visão Geral</RepH>
          <p style={{ lineHeight:1.65, textAlign:'justify' }}>
            {paciente.historico || '—'}
          </p>
          <div style={{ marginTop:12 }}>
            <p style={{ fontWeight:600, marginBottom:6 }}>Procedimentos avaliativos realizados:</p>
            <ul style={{ paddingLeft:20, lineHeight:2, fontSize:13.5 }}>
              <li><b>Aptidão Cardiovascular</b> — Teste do degrau de 6 min</li>
              <li><b>Função respiratória</b> — Pressão Inspiratória Máxima (PImáx) · Pressão Expiratória Máxima (PEmáx)</li>
              <li><b>Força Muscular Global</b> — Teste de Preensão Palmar · TSL 5 repetições · TSL 1 min</li>
            </ul>
          </div>
        </div>

        {/* ── TESTE DO DEGRAU ─────────────────────────────────────────── */}
        <div className="rep-block">
          <RepH>Teste do Degrau de 6 min</RepH>

          <p style={{ lineHeight:1.65, marginBottom:12 }}>
            Testes realizados conforme publicado por RITT, et al. (2021)¹, realizado em um degrau
            de 20 cm de altura. Onde o paciente subiu e desceu o degrau o mais rápido possível por
            6 minutos, sem usar os braços para se apoiar com pausas para descanso permitidas sem
            interrupção no tempo.
          </p>

          <p style={{ fontWeight:700, marginBottom:8 }}>Resultados:</p>
          <ul style={{ paddingLeft:20, lineHeight:2.2, fontSize:13.5 }}>
            <li>Monitoramento realizado com cardiofrequencímetro Polar H10 com registro eletrocardiográfico de 1 derivação (não especificada pelo fabricante).</li>
            {reps && repsP && <li>
              Executou <b>{reps} repetições</b>, o que corresponde a <b>{repsPct}% do predito</b> ({r1(repsP)} rep) para idade e sexo.
            </li>}
            <li>Apresentou resposta {ev.degrau?.arritmia ? 'alterada' : 'normal'} da FC, com aumento progressivo{ev.degrau?.arritmia ? ' e arritmias observadas' : ', porém acentuado nos primeiros minutos'}.</li>
            <li>Apresentou resposta {ev.degrau?.broncoespasmo ? 'alterada' : 'normal'} da Pressão Arterial retornando aos valores basais após encerramento do teste.</li>
            {ev.degrau?.borgMax && <li>
              Percepção de Esforço medido pela escala de BORG apresentou valor máximo de <b>{ev.degrau.borgMax} pontos</b> ({borgLabel(ev.degrau.borgMax)}).
            </li>}
            <li>{ev.degrau?.arritmia ? 'Foram detectadas alterações de ritmo durante o teste.' : 'Apresentou ritmo regular, sem arritmias detectáveis.'}</li>
            <li>{ev.degrau?.interrupcao ? 'Realizou o teste com interrupções.' : 'Realizou o teste sem interrupções no ritmo.'}</li>
            <li>{ev.degrau?.broncoespasmo ? 'Foram observados sinais de broncoespasmo/tosse ou necessidade de O₂ suplementar.' : 'Não foram observados distúrbios perfusionais, exacerbações de broncoespasmo, tosse ou necessidade de uso de O₂ suplementar durante o teste.'}</li>
            <li>As variáveis cardiorrespiratórias e BORG podem ser analisadas nos gráficos a seguir.</li>
          </ul>

          {/* Tabela FC */}
          {fcMax && (
            <table className="rep-table" style={{ marginTop:12 }}>
              <thead>
                <tr><th>Data</th><th>FC máx</th><th>FC rec. 1 min</th><th>FC rec. 3 min</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{fmtDate(ev.data)}</td>
                  <td>{fcMax} bpm</td>
                  <td>{fcRec1 ? `${fcRec1} (Δ ${deltaRec1}) bpm` : '—'}</td>
                  <td>{fcRec3 ? `${fcRec3} (Δ ${deltaRec3}) bpm` : '—'}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Gráficos */}
          {hasChart && (
            <div className="charts-grid no-break" style={{ marginTop:14 }}>
              {/* Barras de repetições */}
              <ChartCard title="Teste do Degrau — Repetições">
                <BarChart data={[
                  { name:'Executado', valor: reps ?? 0, fill:'#D14B4B' },
                  { name:'Predito',   valor: r1(repsP) ?? 0, fill:'#E3EAEF' },
                ]} margin={{ top:4, right:4, left:-18, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip />
                  <Bar dataKey="valor" radius={[4,4,0,0]}>
                    {[{ fill:'#D14B4B' },{ fill:'#CCD5DC' }].map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
              <ChartCard title="FC e SpO₂">
                <LineChart data={chartData} margin={{ top:4, right:4, left:-18, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip /><Legend wrapperStyle={{ fontSize:10 }} />
                  <Line dataKey="FC" stroke="var(--bad)" strokeWidth={2} dot={{ r:2 }} />
                  <Line dataKey="SpO2" stroke="var(--good)" strokeWidth={2} dot={{ r:2 }} />
                </LineChart>
              </ChartCard>
              <ChartCard title="PAS e PAD">
                <LineChart data={chartData} margin={{ top:4, right:4, left:-18, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip /><Legend wrapperStyle={{ fontSize:10 }} />
                  <Line dataKey="PAS" stroke="var(--good)" strokeWidth={2} dot={{ r:2 }} />
                  <Line dataKey="PAD" stroke="var(--bad)" strokeWidth={2} dot={{ r:2 }} />
                </LineChart>
              </ChartCard>
              <ChartCard title="BORG e PSE">
                <BarChart data={chartData} margin={{ top:4, right:4, left:-18, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:10 }} />
                  <Tooltip /><Legend wrapperStyle={{ fontSize:10 }} />
                  <Bar dataKey="BORG" fill="var(--teal)" radius={[3,3,0,0]} />
                  <Bar dataKey="PSE"  fill="var(--navy)" radius={[3,3,0,0]} />
                </BarChart>
              </ChartCard>
            </div>
          )}

          {ev.degrau?.obs && <p style={{ marginTop:10 }}>{ev.degrau.obs}</p>}

          {/* Imagens do degrau */}
          {(ev.degrau?.imagens ?? []).length > 0 && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontWeight:600, marginBottom:8 }}>Registros (ECG / imagens):</p>
              <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
                {ev.degrau.imagens.map((img, i) => (
                  <img key={i} src={img.base64} alt={img.nome}
                    style={{ maxWidth:260, borderRadius:8, border:'1px solid var(--border)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Equações de referência */}
          <div style={{ marginTop:14, padding:10, background:'var(--bg)', borderRadius:8, fontSize:11.5, color:'var(--sub)' }}>
            <b>Equações de referência:</b><br />
            TD6' (Albuquerque et al, 2019): (166,9 – idade) + (0,7 × FC) + (20,7 × sexo; Masc: 1, Fem: 0)<br />
            ACSM (2018): VO₂pico = (0,02 × distância [m]) – (0,191 × idade) – (0,07 × peso [kg]) + (0,09 × altura [cm]) + (0,26 × PTP ×10⁻³) + 2,45
          </div>

          <div style={{ marginTop:8, fontSize:11, color:'var(--sub)' }}>
            ¹ Ritt LEF, Darzé ES, Feitosa GF, Porto JS, Bastos G, Albuquerque RBL de, et al. O Teste do Degrau de Seis Minutos
            como Preditor de Capacidade Funcional de Acordo com o Consumo de Oxigênio de Pico em Pacientes Cardíacos.
            Arq Bras Cardiol [Internet]. 2021 Nov;116(5):889–95. DOI: 10.36660/abc.20190624
          </div>
        </div>

        {/* ── FUNÇÃO RESPIRATÓRIA ─────────────────────────────────────── */}
        <div className="rep-block no-break">
          <RepH>Função Muscular Respiratória</RepH>

          {/* PImáx */}
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, color:'var(--teal-dark)', marginBottom:6 }}>Pressão Inspiratória Máxima</p>
            <p style={{ lineHeight:1.65, marginBottom:8 }}>
              A pressão inspiratória máxima (PImáx) representa a força dos músculos inspiratórios e
              sua avaliação é crucial para pneumopatas e cardiopatas, pois a fraqueza desses músculos
              pode levar a dificuldades respiratórias, intolerância ao exercício e piora da qualidade de vida.
            </p>
            {pim && (
              <>
                <p style={{ lineHeight:1.65, marginBottom:8 }}>
                  Na avaliação da Pressão Inspiratória Máxima, obteve um valor de <b>{pim} cmH₂O</b>,
                  correspondendo a <b>{pimPct}% do predito</b> ({r1(pimP)} cmH₂O), classificando-se,
                  portanto, com força muscular inspiratória <b>{pimPct >= 80 ? 'normal' : 'reduzida'}</b>.
                </p>
                <RepTable rows={[['PImáx', `${pim} cmH₂O`, pimP, pimPct]]} />
              </>
            )}
          </div>

          {/* PEmáx */}
          <div>
            <p style={{ fontWeight:700, color:'var(--teal-dark)', marginBottom:6 }}>Pressão Expiratória Máxima</p>
            <p style={{ lineHeight:1.65, marginBottom:8 }}>
              A pressão expiratória máxima (PEmáx) representa a força dos músculos expiratórios e,
              embora ela seja menos comum de ser alterada, sua diminuição impacta significativamente
              em algumas funções como a tosse, intolerância ao exercício e piora da qualidade de vida.
            </p>
            {pem && (
              <>
                <p style={{ lineHeight:1.65, marginBottom:8 }}>
                  Na avaliação da Pressão Expiratória Máxima, obteve um valor de <b>{pem} cmH₂O</b>,
                  correspondendo a <b>{pemPct}% do predito</b> ({r1(pemP)} cmH₂O), classificando-se,
                  portanto, com força muscular expiratória <b>{pemPct >= 80 ? 'normal' : 'reduzida'}</b>.
                </p>
                <RepTable rows={[['PEmáx', `${pem} cmH₂O`, pemP, pemPct]]} />
              </>
            )}
          </div>
        </div>

        {/* ── FUNÇÃO PERIFÉRICA ───────────────────────────────────────── */}
        <div className="rep-block no-break">
          <RepH>Função Muscular Periférica</RepH>

          {/* Preensão */}
          <div style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, color:'var(--teal-dark)', marginBottom:6 }}>Força de Preensão Manual</p>
            <p style={{ lineHeight:1.65, marginBottom:8 }}>
              O teste de preensão palmar avalia a força dos músculos da mão e do antebraço,
              utilizando um dinamômetro. Essa medida é importante para avaliar a força muscular global,
              identificar possíveis fraquezas e acompanhar a evolução de tratamentos.
            </p>
            {grip && (
              <>
                <RepTable rows={[['Preensão palmar', `${grip} kgf`, grP, gripPct]]} />
                <p style={{ marginTop:8, lineHeight:1.65 }}>
                  Apresentou força de preensão palmar de <b>{grip} kgf</b>, o que corresponde a <b>{gripPct}%</b> do predito.
                  {gripPct < 80 ? ' Isso representa uma força dos músculos da mão e antebraço reduzida, o que pode representar uma diminuição da composição muscular geral, além de um risco de sarcopenia aumentado.' : ' Força dentro dos parâmetros de normalidade.'}
                </p>
                <div style={{ marginTop:6, fontSize:11.5, color:'var(--sub)' }}>
                  34,996 − (0,382 × idade) + (0,174 × peso) + (13,628 × sexo) | (mas=1; fem=0) — Cálculo predito para força de preensão palmar da mão dominante.
                </div>
              </>
            )}
          </div>

          {/* TSL */}
          <div>
            <p style={{ fontWeight:700, color:'var(--teal-dark)', marginBottom:6 }}>Teste de Sentar e Levantar (TSL)</p>
            <p style={{ lineHeight:1.65, marginBottom:10 }}>
              O movimento de sentar-se e levantar é considerado pré-requisito fundamental para a
              mobilidade e a independência funcional e consegue estimar a capacidade funcional,
              a potência de membros inferiores bem como o risco de quedas.
            </p>
            {sts5 != null && (
              <div style={{ marginBottom:12 }}>
                <p style={{ fontWeight:600, marginBottom:6 }}>TSL 5 repetições</p>
                <table className="rep-table">
                  <thead><tr><th>Data</th><th>Tempo</th><th>Predito</th><th>Risco de Queda</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>{fmtDate(ev.data)}</td>
                      <td>{sts5} s</td>
                      <td>{sts5P} s</td>
                      <td><Tag tone={sts5Risk === 'Diminuído' ? 'good' : 'bad'}>{sts5Risk}</Tag></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {sts1 != null && (
              <div>
                <p style={{ fontWeight:600, marginBottom:6 }}>TSL 1 min</p>
                <table className="rep-table">
                  <thead><tr><th>Data</th><th>Repetições</th><th>Predito</th><th>% predito</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>{fmtDate(ev.data)}</td>
                      <td>{sts1}</td>
                      <td>{sts1P}</td>
                      <td><Tag tone={sts1Pct >= 80 ? 'good' : 'bad'}>{sts1Pct}%</Tag></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── COMPARATIVO ─────────────────────────────────────────────── */}
        {prev && (
          <div className="rep-block no-break">
            <RepH>Evolução — comparativo com {fmtDate(prev.data)}</RepH>
            {(() => {
              const cp = calcEv(prev, paciente)
              const rows = [
                ['Degrau (rep)', calc.reps, cp.reps, 'high'],
                ['PImáx (cmH₂O)', pim, cp.pim, 'high'],
                ['Preensão (kgf)', grip, cp.grip, 'high'],
                ['TSL 5 rep (s)', sts5, cp.sts5, 'low'],
              ].filter(r => r[1] != null && r[2] != null)
              if (!rows.length) return <p className="text-sub">Sem variáveis comparáveis.</p>
              return (
                <table className="rep-table">
                  <thead><tr><th>Variável</th><th>{fmtDate(prev.data).slice(0,5)}</th><th>{fmtDate(ev.data).slice(0,5)}</th><th>Δ</th></tr></thead>
                  <tbody>
                    {rows.map(([name,c,p,dir],i) => {
                      const d = r1(c - p)
                      const better = dir === 'high' ? d > 0 : d < 0
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight:600 }}>{name}</td>
                          <td>{p}</td><td>{c}</td>
                          <td><Tag tone={d === 0 ? 'neutral' : better ? 'good' : 'warn'}>{d > 0 ? '+' : ''}{d}</Tag></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}

            {/* Comparativo IA */}
            <div className="no-print" style={{ marginTop:12 }}>
              <button className="btn-ghost" onClick={handleGerarComparativo} disabled={gerandoComp}>
                <Sparkles size={15} /> {gerandoComp ? 'Gerando...' : 'Gerar análise comparativa com IA'}
              </button>
            </div>
            {comparativoIA && (
              <div style={{ marginTop:10, padding:12, background:'var(--teal-light)', borderRadius:10, lineHeight:1.65, fontSize:13.5 }}>
                {comparativoIA}
              </div>
            )}
          </div>
        )}

        {/* ── CONCLUSÃO ───────────────────────────────────────────────── */}
        <div className="rep-block">
          <RepH>Conclusão</RepH>

          {/* Botão IA */}
          <div style={{ marginBottom:14 }}>
            <button className="btn-ghost no-print" onClick={handleGerarIA} disabled={gerando}>
              <Sparkles size={15} /> {gerando ? 'Gerando conclusão com IA...' : 'Gerar conclusão com IA'}
            </button>
          </div>

          {(ev.conclusaoIA || ev.conclusao) && (
            <p style={{ lineHeight:1.7, textAlign:'justify' }}>
              {ev.conclusaoIA || ev.conclusao}
            </p>
          )}

          {!ev.conclusaoIA && !ev.conclusao && (
            <p className="text-sub" style={{ fontStyle:'italic' }}>
              Clique em "Gerar conclusão com IA" ou adicione o texto manualmente na avaliação.
            </p>
          )}
        </div>

        {/* ASSINATURA */}
        <div className="rep-sign">
          <div style={{ fontWeight:600, color:'var(--navy)', fontSize:13 }}>{ev.profissional}</div>
          <div className="text-sub" style={{ marginTop:4 }}>
            Av. Hermes da Fonseca, 390 — Lj 05 · Petrópolis, Natal/RN · (84) 9 9168-8285 · @respirarfisioterapeutas
          </div>
        </div>

      </div>{/* /report */}
    </>
  )
}
