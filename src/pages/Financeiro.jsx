// src/pages/Financeiro.jsx — Camadas 1 + 2: pacotes, pagamentos, recibos, PIX
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, FileText, Printer,
  QrCode, MessageCircle, Check, CreditCard, AlertCircle,
} from 'lucide-react'
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getPaciente } from '../utils/db'
import {
  fmtBRL, FORMAS_PAGAMENTO, STATUS_PACOTE, calcSaldo, gerarPixCopia,
} from '../utils/financeiro'
import { fmtDate } from '../utils/avaliacao'
import { ASSINATURA_RAVEL } from '../utils/assets'

const PIX_CHAVE  = 'COLOQUE_SUA_CHAVE_PIX_AQUI'  // CPF, CNPJ, e-mail ou telefone
const PIX_NOME   = 'Respirar Fisioterapeutas'
const PIX_CIDADE = 'Natal'

// ── helpers UI ────────────────────────────────────────────────────────────
function Tag({ tone = 'neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>
}
function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}
function Section({ title, icon: Icon, children, right }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="flex-center gap-10" style={{ marginBottom: 14 }}>
        <div className="section-icon"><Icon size={16} /></div>
        <h2 style={{ flex: 1 }}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )
}

// ── QR Code PIX via API gratuita ─────────────────────────────────────────
function QRCodePix({ valor, paciente }) {
  const payload = gerarPixCopia(PIX_CHAVE, PIX_NOME, PIX_CIDADE, valor)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`

  async function enviarWhatsApp() {
    const num = prompt('Número WhatsApp do paciente (com DDD, só números):')
    if (!num) return
    const msg = encodeURIComponent(
      `Olá *${paciente.nome}*!\n\nSegue a cobrança de *${fmtBRL(valor)}* referente ao atendimento fisioterapêutico.\n\n📱 *Chave PIX:* ${PIX_CHAVE}\n\n_Respirar Fisioterapeutas_\n(84) 9 9168-8285`
    )
    window.open(`https://wa.me/55${num.replace(/\D/g,'')}?text=${msg}`, '_blank')
  }

  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <img src={qrUrl} alt="QR Code PIX" style={{ width: 180, height: 180, borderRadius: 12 }} />
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--sub)' }}>Chave PIX: <b>{PIX_CHAVE}</b></div>
      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)', margin: '6px 0' }}>{fmtBRL(valor)}</div>
      <div className="flex gap-8" style={{ justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <button className="btn-soft" onClick={() => { navigator.clipboard.writeText(payload); alert('Código PIX copiado!') }}>
          Copiar código PIX
        </button>
        <button className="btn-soft" onClick={enviarWhatsApp}>
          <MessageCircle size={14} /> Enviar por WhatsApp
        </button>
      </div>
    </div>
  )
}

// ── Recibo imprimível ────────────────────────────────────────────────────
function Recibo({ paciente, pagamento, pacote, onFechar }) {
  return (
    <>
      <div className="no-print page-toolbar" style={{ marginBottom: 18 }}>
        <div className="page-toolbar-title flex-center gap-10">
          <button className="btn-ghost" onClick={onFechar} style={{ padding: '9px 12px' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ flex: 1 }}>Recibo</h1>
        </div>
        <div className="page-toolbar-actions flex gap-10">
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <div className="report">
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--teal)', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 20 }}>
            re<span style={{ color: 'var(--teal)' }}>spir</span>ar
          </div>
          <div style={{ color: '#9FB0C9', fontSize: 10, letterSpacing: 3 }}>FISIOTERAPEUTAS</div>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16, marginTop: 12 }}>RECIBO DE PAGAMENTO</div>
        </div>

        <div className="rep-id" style={{ marginBottom: 18 }}>
          {[
            ['Paciente',  paciente.nome],
            ['Data',      fmtDate(pagamento.data)],
            ['Valor',     fmtBRL(pagamento.valor)],
            ['Forma',     pagamento.forma],
            ['Referente', pacote?.nome || pagamento.obs || 'Atendimento fisioterapêutico'],
          ].map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
        </div>

        <p style={{ lineHeight: 1.7, textAlign: 'justify', fontSize: 13.5 }}>
          Recebi de <b>{paciente.nome}</b> a quantia de <b>{fmtBRL(pagamento.valor)}</b>
          {' '}({valorPorExtenso(pagamento.valor)}), referente a serviços de fisioterapia
          cardiorrespiratória prestados pela Respirar Fisioterapeutas.
        </p>

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <img src={ASSINATURA_RAVEL} alt="Assinatura"
              style={{ height: 34, margin: '0 auto 2px', display: 'block' }} />
            <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 8, fontSize: 13 }}>
              Dr. Ravel Marinho — CREFITO 1 nº 216.212 F
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>Responsável técnico</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 8, fontSize: 13 }}>
              {paciente.nome}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>Paciente / Responsável</div>
          </div>
        </div>

        <div style={{ marginTop: 32, fontSize: 11, color: 'var(--sub)', textAlign: 'center' }}>
          Natal/RN, {new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}<br />
          Av. Hermes da Fonseca, 390 — Lj 05 · Petrópolis · (84) 9 9168-8285 · @respirarfisioterapeutas
        </div>
      </div>
    </>
  )
}

function valorPorExtenso(v) {
  // simplificado — suficiente para recibos
  const n = Math.round(Number(v) * 100)
  const reais = Math.floor(n / 100)
  const cents = n % 100
  if (!reais && !cents) return 'zero reais'
  const unidades = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez',
    'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
  const dezenas = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos',
    'seiscentos','setecentos','oitocentos','novecentos']
  function nn(x) {
    if (x === 100) return 'cem'
    const c = Math.floor(x/100), d = Math.floor((x%100)/10), u = x%10
    const parts = []
    if (c) parts.push(centenas[c])
    if (d >= 2) { parts.push(dezenas[d]); if (u) parts.push(unidades[u]) }
    else if (d === 1) parts.push(unidades[10 + u])
    else if (u) parts.push(unidades[u])
    return parts.join(' e ')
  }
  const partes = []
  if (reais) partes.push(`${nn(reais)} real${reais > 1 ? 's' : ''}`)
  if (cents) partes.push(`${nn(cents)} centavo${cents > 1 ? 's' : ''}`)
  return partes.join(' e ')
}

// ── Página principal ─────────────────────────────────────────────────────
export default function Financeiro() {
  const { pid } = useParams()
  const nav = useNavigate()

  const [paciente, setPaciente]     = useState(null)
  const [pacotes, setPacotes]       = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [sessoes, setSessoes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [aba, setAba]               = useState('resumo') // resumo | pacote | pagamento | pix | recibo
  const [pacoteSel, setPacoteSel]   = useState(null)
  const [pagSel, setPagSel]         = useState(null)
  const [salvando, setSalvando]     = useState(false)
  const [showPix, setShowPix]       = useState(false)
  const [showRecibo, setShowRecibo] = useState(null) // {pagamento, pacote}

  const [formPacote, setFormPacote] = useState({ nome:'Plano de tratamento', totalSessoes:'20', valorSessao:'', inicio: new Date().toISOString().slice(0,10) })
  const [formPag, setFormPag]       = useState({ data: new Date().toISOString().slice(0,10), valor:'', forma:'PIX', pacoteId:'', obs:'' })

  async function carregar() {
    const [p, pkSnap, pgSnap, ssSnap] = await Promise.all([
      getPaciente(pid),
      getDocs(query(collection(db,'pacientes',pid,'pacotes'), orderBy('inicio','desc'))),
      getDocs(query(collection(db,'pacientes',pid,'pagamentos'), orderBy('data','desc'))),
      getDocs(query(collection(db,'pacientes',pid,'sessoes'), orderBy('data','desc'))),
    ])
    setPaciente(p)
    setPacotes(pkSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    setPagamentos(pgSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    setSessoes(ssSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { carregar() }, [pid])

  async function addPacote() {
    setSalvando(true)
    const total = Number(formPacote.totalSessoes) * Number(formPacote.valorSessao)
    await addDoc(collection(db,'pacientes',pid,'pacotes'), {
      ...formPacote,
      totalSessoes: Number(formPacote.totalSessoes),
      valorSessao: Number(formPacote.valorSessao),
      valorTotal: total,
      status: 'ativo',
      criadoEm: serverTimestamp(),
    })
    setAba('resumo')
    setSalvando(false)
    await carregar()
  }

  async function addPagamento() {
    setSalvando(true)
    await addDoc(collection(db,'pacientes',pid,'pagamentos'), {
      ...formPag, valor: Number(formPag.valor), criadoEm: serverTimestamp(),
    })
    setAba('resumo')
    setSalvando(false)
    await carregar()
  }

  async function delPacote(id) {
    if (!confirm('Excluir este pacote?')) return
    await deleteDoc(doc(db,'pacientes',pid,'pacotes',id))
    await carregar()
  }

  async function delPagamento(id) {
    if (!confirm('Excluir este pagamento?')) return
    await deleteDoc(doc(db,'pacientes',pid,'pagamentos',id))
    await carregar()
  }

  if (loading) return <div style={{ textAlign:'center', padding:48 }}><span className="spinner" /></div>

  // Se está mostrando recibo
  if (showRecibo) {
    return <Recibo paciente={paciente} pagamento={showRecibo.pagamento}
      pacote={showRecibo.pacote} onFechar={() => setShowRecibo(null)} />
  }

  // Cálculos globais do paciente
  const totalPago   = pagamentos.reduce((s, p) => s + (p.valor||0), 0)
  const totalPacote = pacotes.filter(p => p.status === 'ativo').reduce((s, p) => s + (p.valorTotal||0), 0)
  const saldo       = totalPacote - totalPago
  const sessoesRealizadas = sessoes.length
  const sessoesContratadas = pacotes.filter(p => p.status==='ativo').reduce((s,p) => s + (p.totalSessoes||0), 0)
  const pixValor = saldo > 0 ? saldo : 0

  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom:18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding:'9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex:1 }}>
          <h1>Financeiro</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
        {[
          ['Plano atual', fmtBRL(totalPacote), 'neutral'],
          ['Total pago', fmtBRL(totalPago), 'good'],
          ['Saldo devedor', fmtBRL(saldo), saldo > 0 ? 'bad' : 'good'],
          ['Sessões', `${sessoesRealizadas} / ${sessoesContratadas}`, 'neutral'],
        ].map(([lbl, val, tone]) => (
          <div key={lbl} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--navy)' }}>{val}</div>
            <div className="text-sub" style={{ fontSize:12 }}>{lbl}</div>
            {lbl === 'Saldo devedor' && saldo > 0 && (
              <button className="btn-soft" style={{ marginTop:8, fontSize:12, padding:'5px 10px' }}
                onClick={() => setShowPix(true)}>
                <QrCode size={13} /> Gerar PIX
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Alerta inadimplência */}
      {saldo > 0 && sessoesRealizadas > sessoesContratadas * 0.8 && (
        <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--warn-bg)', color:'var(--warn)', borderRadius:10, display:'flex', alignItems:'center', gap:8, fontSize:13.5 }}>
          <AlertCircle size={16} />
          Paciente utilizou {Math.round(sessoesRealizadas/sessoesContratadas*100)}% das sessões contratadas com saldo de {fmtBRL(saldo)} em aberto.
        </div>
      )}

      {/* PIX */}
      {showPix && (
        <div className="card" style={{ marginBottom:14 }}>
          <div className="flex-center gap-10" style={{ marginBottom:10 }}>
            <h2 style={{ flex:1 }}>Cobrança PIX — {fmtBRL(pixValor)}</h2>
            <button className="btn-ghost" style={{ padding:'6px 10px' }} onClick={() => setShowPix(false)}>Fechar</button>
          </div>
          <QRCodePix valor={pixValor} paciente={paciente} />
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-10" style={{ flexWrap:'wrap', marginBottom:14 }}>
        <button className="btn-primary" onClick={() => setAba(aba==='pagamento'?'resumo':'pagamento')}>
          <Plus size={15} /> Registrar pagamento
        </button>
        <button className="btn-ghost" onClick={() => setAba(aba==='pacote'?'resumo':'pacote')}>
          <Plus size={15} /> Novo pacote
        </button>
        {!showPix && saldo > 0 && (
          <button className="btn-soft" onClick={() => setShowPix(true)}>
            <QrCode size={15} /> Gerar cobrança PIX
          </button>
        )}
      </div>

      {/* Form: novo pagamento */}
      {aba === 'pagamento' && (
        <div className="card" style={{ marginBottom:14 }}>
          <h2 style={{ marginBottom:12 }}>Registrar pagamento</h2>
          <div className="grid-2" style={{ marginBottom:10 }}>
            <Field label="Data"><input className="inp" type="date" value={formPag.data} onChange={e => setFormPag(f=>({...f,data:e.target.value}))} /></Field>
            <Field label="Valor (R$)"><input className="inp" type="number" placeholder="0,00" value={formPag.valor} onChange={e => setFormPag(f=>({...f,valor:e.target.value}))} /></Field>
            <Field label="Forma de pagamento">
              <select className="inp" value={formPag.forma} onChange={e => setFormPag(f=>({...f,forma:e.target.value}))}>
                {FORMAS_PAGAMENTO.map(fp => <option key={fp}>{fp}</option>)}
              </select>
            </Field>
            <Field label="Pacote vinculado">
              <select className="inp" value={formPag.pacoteId} onChange={e => setFormPag(f=>({...f,pacoteId:e.target.value}))}>
                <option value="">Sem vínculo</option>
                {pacotes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Observação"><input className="inp" value={formPag.obs} onChange={e => setFormPag(f=>({...f,obs:e.target.value}))} /></Field>
          <div className="flex gap-10 mt-12">
            <button className="btn-primary" onClick={addPagamento} disabled={salvando||!formPag.valor}>
              {salvando ? <span className="spinner"/> : <Check size={15}/>} Salvar pagamento
            </button>
            <button className="btn-ghost" onClick={() => setAba('resumo')}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Form: novo pacote */}
      {aba === 'pacote' && (
        <div className="card" style={{ marginBottom:14 }}>
          <h2 style={{ marginBottom:12 }}>Novo pacote de tratamento</h2>
          <div className="grid-2" style={{ marginBottom:10 }}>
            <Field label="Nome do pacote"><input className="inp" value={formPacote.nome} onChange={e => setFormPacote(f=>({...f,nome:e.target.value}))} /></Field>
            <Field label="Data de início"><input className="inp" type="date" value={formPacote.inicio} onChange={e => setFormPacote(f=>({...f,inicio:e.target.value}))} /></Field>
            <Field label="Total de sessões"><input className="inp" type="number" value={formPacote.totalSessoes} onChange={e => setFormPacote(f=>({...f,totalSessoes:e.target.value}))} /></Field>
            <Field label="Valor por sessão (R$)"><input className="inp" type="number" value={formPacote.valorSessao} onChange={e => setFormPacote(f=>({...f,valorSessao:e.target.value}))} /></Field>
          </div>
          {formPacote.totalSessoes && formPacote.valorSessao && (
            <div style={{ padding:'10px 14px', background:'var(--teal-light)', borderRadius:10, fontSize:14, marginBottom:10 }}>
              Total do pacote: <b>{fmtBRL(Number(formPacote.totalSessoes)*Number(formPacote.valorSessao))}</b>
            </div>
          )}
          <div className="flex gap-10">
            <button className="btn-primary" onClick={addPacote} disabled={salvando||!formPacote.valorSessao}>
              {salvando ? <span className="spinner"/> : <Check size={15}/>} Criar pacote
            </button>
            <button className="btn-ghost" onClick={() => setAba('resumo')}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Pacotes */}
      {pacotes.length > 0 && (
        <Section title={`Pacotes (${pacotes.length})`} icon={CreditCard}>
          <div style={{ display:'grid', gap:8 }}>
            {pacotes.map(pk => {
              const pago = pagamentos.filter(p => p.pacoteId===pk.id).reduce((s,p)=>s+(p.valor||0),0)
              const restante = (pk.valorTotal||0) - pago
              return (
                <div key={pk.id} style={{ padding:'12px 14px', background:'var(--bg)', borderRadius:12 }}>
                  <div className="flex-center gap-10">
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:650 }}>{pk.nome}</div>
                      <div className="text-sub" style={{ fontSize:12 }}>
                        {pk.totalSessoes} sessões · {fmtBRL(pk.valorSessao)}/sessão · início {fmtDate(pk.inicio)}
                      </div>
                    </div>
                    <Tag tone={STATUS_PACOTE[pk.status]?.tone}>{STATUS_PACOTE[pk.status]?.label}</Tag>
                    <button className="btn-danger" style={{ padding:'6px 9px' }} onClick={() => delPacote(pk.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10, textAlign:'center' }}>
                    {[['Total', fmtBRL(pk.valorTotal), 'neutral'], ['Pago', fmtBRL(pago), 'good'], ['Restante', fmtBRL(restante), restante>0?'bad':'good']].map(([l,v,t]) => (
                      <div key={l} style={{ padding:'6px 8px', background:'#fff', borderRadius:8 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{v}</div>
                        <div className="text-sub" style={{ fontSize:11 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Pagamentos */}
      {pagamentos.length > 0 && (
        <Section title={`Pagamentos (${pagamentos.length})`} icon={FileText}>
          <div style={{ display:'grid', gap:8 }}>
            {pagamentos.map(pg => (
              <div key={pg.id} className="flex-center gap-10"
                style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:650 }}>{fmtBRL(pg.valor)} <Tag tone="good">{pg.forma}</Tag></div>
                  <div className="text-sub" style={{ fontSize:12 }}>{fmtDate(pg.data)} {pg.obs && `· ${pg.obs}`}</div>
                </div>
                <button className="btn-soft" style={{ padding:'6px 10px', fontSize:12 }}
                  onClick={() => setShowRecibo({ pagamento:pg, pacote:pacotes.find(p=>p.id===pg.pacoteId) })}>
                  <FileText size={13} /> Recibo
                </button>
                <button className="btn-danger" style={{ padding:'6px 9px' }} onClick={() => delPagamento(pg.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:'10px 14px', background:'var(--teal-light)', borderRadius:10, fontWeight:700, color:'var(--navy)', textAlign:'right' }}>
            Total recebido: {fmtBRL(totalPago)}
          </div>
        </Section>
      )}
    </>
  )
}
