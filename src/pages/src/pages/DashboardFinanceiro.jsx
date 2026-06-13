// src/pages/DashboardFinanceiro.jsx — Camadas 3 + 4
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, TrendingUp, AlertTriangle, Download,
  DollarSign, Receipt, Percent, Users,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { listarPacientes } from '../utils/db'
import {
  fmtBRL, fmtMes, CATEGORIAS_DESPESA, ultimosMeses,
} from '../utils/financeiro'
import { fmtDate } from '../utils/avaliacao'

function StatCard({ icon: Icon, label, value, sub, tone = 'teal' }) {
  const colors = {
    teal:    ['var(--teal-light)',   'var(--teal-dark)'],
    good:    ['var(--good-bg)',      'var(--good)'],
    bad:     ['var(--bad-bg)',       'var(--bad)'],
    warn:    ['var(--warn-bg)',      'var(--warn)'],
    neutral: ['#EEF2F6',            'var(--navy-soft)'],
  }
  const [bg, fg] = colors[tone] ?? colors.teal
  return (
    <div className="card" style={{ flex:1, minWidth:130 }}>
      <div style={{ width:34, height:34, borderRadius:9, background:bg, color:fg, display:'grid', placeItems:'center', marginBottom:8 }}>
        <Icon size={17} />
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:'var(--navy)' }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--navy-soft)' }}>{label}</div>
      {sub && <div className="text-sub" style={{ fontSize:11.5, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display:'block' }}>
      <span className="lbl">{label}</span>
      {children}
    </label>
  )
}

function Tag({ tone='neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}

export default function DashboardFinanceiro() {
  const nav = useNavigate()
  const [loading, setLoading]       = useState(true)
  const [dados, setDados]           = useState(null)
  const [despesas, setDespesas]     = useState([])
  const [abaDespesa, setAbaDespesa] = useState(false)
  const [formDesp, setFormDesp]     = useState({
    data: new Date().toISOString().slice(0,10), categoria: CATEGORIAS_DESPESA[0],
    descricao:'', valor:'', fisioterapeuta:'Dr. Ravel Marinho',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [pacientes, despSnap] = await Promise.all([
      listarPacientes(),
      getDocs(query(collection(db,'despesas'), orderBy('data','desc'))),
    ])
    const desps = despSnap.docs.map(d => ({ id:d.id, ...d.data() }))
    setDespesas(desps)

    const meses = ultimosMeses(6)
    const mesAtual = meses[meses.length - 1]

    // Agrega pagamentos e despesas de todos os pacientes
    const receitasMes = Object.fromEntries(meses.map(m => [m, 0]))
    const despMes     = Object.fromEntries(meses.map(m => [m, 0]))
    desps.forEach(d => { if (d.data?.slice(0,7) in despMes) despMes[d.data.slice(0,7)] += d.valor||0 })

    let totalRecebidoMes = 0, totalInadimplente = 0
    const inadimplentes = []
    let totalTicket = 0, nTicket = 0

    await Promise.all(pacientes.map(async p => {
      const [pgSnap, pkSnap] = await Promise.all([
        getDocs(collection(db,'pacientes',p.id,'pagamentos')),
        getDocs(collection(db,'pacientes',p.id,'pacotes')),
      ])
      const pags = pgSnap.docs.map(d => ({ id:d.id, ...d.data() }))
      const paks = pkSnap.docs.map(d => ({ id:d.id, ...d.data() }))

      pags.forEach(pg => {
        const m = pg.data?.slice(0,7)
        if (m in receitasMes) receitasMes[m] += pg.valor||0
        if (m === mesAtual) totalRecebidoMes += pg.valor||0
      })

      const totalPago = pags.reduce((s,pg) => s+(pg.valor||0), 0)
      const totalPacote = paks.filter(pk=>pk.status==='ativo').reduce((s,pk)=>s+(pk.valorTotal||0),0)
      const saldo = totalPacote - totalPago
      if (saldo > 0) {
        totalInadimplente += saldo
        inadimplentes.push({ paciente:p, saldo })
      }
      if (totalPago > 0) { totalTicket += totalPago; nTicket++ }
    }))

    const totalDespMes = Object.entries(despMes).filter(([m]) => m===mesAtual).reduce((s,[,v])=>s+v,0)
    const lucroMes = totalRecebidoMes - totalDespMes
    const totalDesp = desps.reduce((s,d)=>s+(d.valor||0),0)
    const totalReceita = Object.values(receitasMes).reduce((s,v)=>s+v,0)

    // Chart data
    const chartData = meses.map(m => ({
      mes: fmtMes(m),
      Receita: Math.round(receitasMes[m]),
      Despesas: Math.round(despMes[m]),
      Lucro: Math.round(receitasMes[m] - despMes[m]),
    }))

    // Por categoria de despesa
    const porCategoria = {}
    desps.forEach(d => { porCategoria[d.categoria] = (porCategoria[d.categoria]||0) + (d.valor||0) })
    const catChart = Object.entries(porCategoria).map(([cat,val]) => ({ cat: cat.split('/')[0].trim(), val: Math.round(val) }))
      .sort((a,b) => b.val - a.val)

    setDados({
      totalRecebidoMes, totalDespMes, lucroMes,
      totalReceita, totalDesp,
      ticketMedio: nTicket ? Math.round(totalTicket/nTicket) : 0,
      inadimplentes: inadimplentes.sort((a,b)=>b.saldo-a.saldo),
      totalInadimplente,
      chartData, catChart,
      nPacientes: pacientes.length,
    })
    setLoading(false)
  }

  async function addDespesa() {
    setSalvando(true)
    await addDoc(collection(db,'despesas'), { ...formDesp, valor:Number(formDesp.valor), criadoEm:serverTimestamp() })
    setAbaDespesa(false)
    setFormDesp(f => ({ ...f, descricao:'', valor:'' }))
    setSalvando(false)
    await carregar()
  }

  async function delDespesa(id) {
    if (!confirm('Excluir esta despesa?')) return
    await deleteDoc(doc(db,'despesas',id))
    await carregar()
  }

  // ── Exportação CSV ────────────────────────────────────────────────────
  async function exportarCSV() {
    const pacientes = await listarPacientes()
    const linhas = [['Data','Tipo','Descrição','Valor','Paciente','Forma','Categoria']]

    await Promise.all(pacientes.map(async p => {
      const pags = await getDocs(collection(db,'pacientes',p.id,'pagamentos'))
      pags.docs.forEach(d => {
        const pg = d.data()
        linhas.push([pg.data||'', 'Receita', pg.obs||'Atendimento', pg.valor||0, p.nome, pg.forma||'', ''])
      })
    }))
    despesas.forEach(d => {
      linhas.push([d.data||'', 'Despesa', d.descricao||d.categoria, -(d.valor||0), '', '', d.categoria])
    })
    linhas.sort((a,b) => (a[0]||'').localeCompare(b[0]||''))

    const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='financeiro-respirar.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Carnê-Leão ────────────────────────────────────────────────────────
  async function exportarCarneleao() {
    const pacientes = await listarPacientes()
    const ano = new Date().getFullYear()
    const meses = Array.from({length:12},(_,i) => String(i+1).padStart(2,'0'))
    const linhas = [['Mês','Receita Bruta','Despesas Dedutíveis','Base de Cálculo']]

    const recMes = Object.fromEntries(meses.map(m => [m,0]))
    const despMes = Object.fromEntries(meses.map(m => [m,0]))

    await Promise.all(pacientes.map(async p => {
      const pags = await getDocs(collection(db,'pacientes',p.id,'pagamentos'))
      pags.docs.forEach(d => {
        const pg = d.data()
        if (pg.data?.startsWith(String(ano))) {
          const m = pg.data.slice(5,7)
          recMes[m] = (recMes[m]||0) + (pg.valor||0)
        }
      })
    }))
    despesas.forEach(d => {
      if (d.data?.startsWith(String(ano))) {
        const m = d.data.slice(5,7)
        despMes[m] = (despMes[m]||0) + (d.valor||0)
      }
    })

    meses.forEach(m => {
      const rec = recMes[m] || 0
      const desp = despMes[m] || 0
      if (rec > 0 || desp > 0)
        linhas.push([`${m}/${ano}`, rec.toFixed(2), desp.toFixed(2), (rec-desp).toFixed(2)])
    })

    const csv = linhas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`carne-leao-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div style={{ textAlign:'center', padding:48 }}><span className="spinner" /></div>

  const d = dados

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav('/')} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex:1 }}>
          <h1>Dashboard Financeiro</h1>
          <p className="text-sub">Gestão financeira da clínica</p>
        </div>
        <button className="btn-ghost" onClick={exportarCSV}><Download size={15} /> CSV</button>
        <button className="btn-ghost" onClick={exportarCarneleao}><Receipt size={15} /> Carnê-Leão</button>
      </div>

      {/* Cards */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
        <StatCard icon={DollarSign} label="Receita este mês" value={fmtBRL(d.totalRecebidoMes)} tone="good" />
        <StatCard icon={TrendingUp} label="Lucro este mês" value={fmtBRL(d.lucroMes)} tone={d.lucroMes>=0?'good':'bad'} />
        <StatCard icon={Percent} label="Ticket médio" value={fmtBRL(d.ticketMedio)} tone="teal" />
        <StatCard icon={AlertTriangle} label="Inadimplência" value={fmtBRL(d.totalInadimplente)} sub={`${d.inadimplentes.length} paciente${d.inadimplentes.length!==1?'s':''}`} tone={d.totalInadimplente>0?'warn':'good'} />
      </div>

      {/* Gráfico receita x despesas */}
      <div className="card" style={{ marginBottom:14 }}>
        <h2 style={{ marginBottom:14 }}>Receita × Despesas × Lucro (6 meses)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={d.chartData} margin={{ top:4, right:8, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize:11, fill:'var(--sub)' }} />
            <YAxis tick={{ fontSize:11, fill:'var(--sub)' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={v => fmtBRL(v)} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Bar dataKey="Receita"  fill="var(--good)" radius={[4,4,0,0]} />
            <Bar dataKey="Despesas" fill="var(--bad)"  radius={[4,4,0,0]} />
            <Bar dataKey="Lucro"    fill="var(--teal)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Inadimplentes */}
      {d.inadimplentes.length > 0 && (
        <div className="card" style={{ marginBottom:14, borderColor:'var(--warn)' }}>
          <div className="flex-center gap-10" style={{ marginBottom:12 }}>
            <div className="section-icon" style={{ background:'var(--warn-bg)', color:'var(--warn)' }}><AlertTriangle size={16} /></div>
            <h2 style={{ flex:1 }}>Inadimplência</h2>
            <Tag tone="warn">{fmtBRL(d.totalInadimplente)}</Tag>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {d.inadimplentes.map(({ paciente:p, saldo }) => (
              <div key={p.id} className="flex-center gap-10"
                style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:10 }}>
                <div className="avatar" style={{ background:'var(--warn)', width:34, height:34, fontSize:14 }}>{p.nome[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:650 }}>{p.nome}</div>
                  <div className="text-sub" style={{ fontSize:12 }}>Saldo em aberto</div>
                </div>
                <Tag tone="warn">{fmtBRL(saldo)}</Tag>
                <button className="btn-soft" style={{ fontSize:12, padding:'6px 10px' }}
                  onClick={() => nav(`/paciente/${p.id}/financeiro`)}>
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Despesas */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="flex-center gap-10" style={{ marginBottom:12 }}>
          <h2 style={{ flex:1 }}>Despesas</h2>
          <Tag tone="neutral">{fmtBRL(d.totalDesp)} total</Tag>
          <button className="btn-soft" style={{ padding:'6px 10px', fontSize:12 }}
            onClick={() => setAbaDespesa(a => !a)}>
            <Download size={13} /> {abaDespesa ? 'Fechar' : 'Registrar despesa'}
          </button>
        </div>

        {abaDespesa && (
          <div style={{ padding:14, background:'var(--bg)', borderRadius:12, marginBottom:12 }}>
            <div className="grid-2" style={{ marginBottom:10 }}>
              <Field label="Data"><input className="inp" type="date" value={formDesp.data} onChange={e=>setFormDesp(f=>({...f,data:e.target.value}))} /></Field>
              <Field label="Categoria">
                <select className="inp" value={formDesp.categoria} onChange={e=>setFormDesp(f=>({...f,categoria:e.target.value}))}>
                  {CATEGORIAS_DESPESA.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Descrição"><input className="inp" value={formDesp.descricao} onChange={e=>setFormDesp(f=>({...f,descricao:e.target.value}))} /></Field>
              <Field label="Valor (R$)"><input className="inp" type="number" value={formDesp.valor} onChange={e=>setFormDesp(f=>({...f,valor:e.target.value}))} /></Field>
              <Field label="Fisioterapeuta"><input className="inp" value={formDesp.fisioterapeuta} onChange={e=>setFormDesp(f=>({...f,fisioterapeuta:e.target.value}))} /></Field>
            </div>
            <div className="flex gap-10">
              <button className="btn-primary" onClick={addDespesa} disabled={salvando||!formDesp.valor}>
                {salvando?<span className="spinner"/>:'✓'} Salvar despesa
              </button>
              <button className="btn-ghost" onClick={()=>setAbaDespesa(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Categorias */}
        {d.catChart.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={d.catChart} layout="vertical" margin={{ top:4, right:8, left:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v=>`R$${v}`} />
                <YAxis type="category" dataKey="cat" tick={{ fontSize:10 }} width={100} />
                <Tooltip formatter={v=>fmtBRL(v)} />
                <Bar dataKey="val" fill="var(--bad)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de despesas recentes */}
        <div style={{ display:'grid', gap:6, maxHeight:300, overflowY:'auto' }}>
          {despesas.map(dep => (
            <div key={dep.id} className="flex-center gap-10"
              style={{ padding:'8px 12px', background:'var(--bg)', borderRadius:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13.5 }}>{dep.descricao||dep.categoria}</div>
                <div className="text-sub" style={{ fontSize:12 }}>{fmtDate(dep.data)} · {dep.categoria}</div>
              </div>
              <Tag tone="bad">{fmtBRL(dep.valor)}</Tag>
              <button className="btn-danger" style={{ padding:'5px 8px' }} onClick={()=>delDespesa(dep.id)}>
                <Receipt size={12} />
              </button>
            </div>
          ))}
          {despesas.length===0 && <p className="text-sub" style={{ padding:'8px 0' }}>Nenhuma despesa registrada.</p>}
        </div>
      </div>

      {/* Alertas camada 4 */}
      <div className="card" style={{ background:'var(--bg)', border:'none' }}>
        <h2 style={{ marginBottom:10 }}>Exportações</h2>
        <div className="flex gap-10" style={{ flexWrap:'wrap' }}>
          <button className="btn-ghost" onClick={exportarCSV}>
            <Download size={15} /> CSV completo (receitas + despesas)
          </button>
          <button className="btn-ghost" onClick={exportarCarneleao}>
            <Receipt size={15} /> Carnê-Leão {new Date().getFullYear()} (para contador / IR)
          </button>
        </div>
        <p className="text-sub" style={{ fontSize:12, marginTop:10, lineHeight:1.6 }}>
          O <b>CSV completo</b> lista todas as receitas e despesas com data, paciente e categoria — ideal para enviar ao contador.<br />
          O <b>Carnê-Leão</b> agrega por mês a receita bruta, despesas dedutíveis e base de cálculo para o imposto de renda do autônomo.
        </p>
      </div>
    </>
  )
}
