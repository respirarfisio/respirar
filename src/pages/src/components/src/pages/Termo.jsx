// src/pages/Termo.jsx — termo de consentimento com assinatura digital
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eraser, Check, Printer, FileSignature } from 'lucide-react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getPaciente } from '../utils/db'
import { fmtDate } from '../utils/avaliacao'

const TEXTO_PADRAO = (nome) => `Eu, ${nome || '____________________'}, declaro que fui devidamente informado(a) pelo fisioterapeuta responsável sobre os procedimentos de avaliação fisioterapêutica a serem realizados, incluindo testes de esforço físico (teste do degrau de 6 minutos, testes de sentar e levantar), avaliação de força muscular respiratória (manovacuometria) e periférica (dinamometria de preensão palmar).

Estou ciente de que os testes de esforço envolvem atividade física e podem provocar alterações de frequência cardíaca, pressão arterial e cansaço, sendo monitorados continuamente por profissional habilitado, com interrupção imediata em caso de qualquer intercorrência.

Autorizo, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), a coleta e o tratamento dos meus dados pessoais e de saúde exclusivamente para fins de avaliação, acompanhamento terapêutico e emissão de relatórios, sendo garantido o sigilo profissional e o direito de acesso, correção e exclusão dos meus dados a qualquer momento.

Declaro que li, compreendi e concordo com os termos acima.`

export default function Termo() {
  const { pid } = useParams()
  const nav = useNavigate()
  const canvasRef = useRef(null)
  const desenhando = useRef(false)

  const [paciente, setPaciente] = useState(null)
  const [texto, setTexto] = useState('')
  const [termoSalvo, setTermoSalvo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [temAssinatura, setTemAssinatura] = useState(false)

  useEffect(() => {
    (async () => {
      const p = await getPaciente(pid)
      setPaciente(p)
      setTexto(TEXTO_PADRAO(p?.nome))
      const snap = await getDoc(doc(db, 'pacientes', pid, 'documentos', 'termo'))
      if (snap.exists()) setTermoSalvo(snap.data())
    })()
  }, [pid])

  // ── Canvas de assinatura ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#16233F'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const pos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY }
    }

    const start = (e) => {
      e.preventDefault()
      desenhando.current = true
      const { x, y } = pos(e)
      ctx.beginPath(); ctx.moveTo(x, y)
    }
    const move = (e) => {
      if (!desenhando.current) return
      e.preventDefault()
      const { x, y } = pos(e)
      ctx.lineTo(x, y); ctx.stroke()
      setTemAssinatura(true)
    }
    const end = () => { desenhando.current = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [paciente, termoSalvo])

  function limpar() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setTemAssinatura(false)
  }

  async function salvar() {
    if (!temAssinatura) { alert('Colete a assinatura antes de salvar.'); return }
    setSalvando(true)
    const assinatura = canvasRef.current.toDataURL('image/png')
    const dados = {
      texto,
      assinatura,
      assinadoEm: new Date().toISOString(),
      criadoEm: serverTimestamp(),
    }
    await setDoc(doc(db, 'pacientes', pid, 'documentos', 'termo'), dados)
    setTermoSalvo(dados)
    setSalvando(false)
  }

  if (!paciente) return <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>

  // ── Termo já assinado — exibição ───────────────────────────────────────
  if (termoSalvo) {
    return (
      <>
        <div className="no-print flex-center gap-10" style={{ marginBottom: 18 }}>
          <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding: '9px 12px' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1>Termo de Consentimento</h1>
            <p className="text-sub">{paciente.nome} — assinado em {fmtDate(termoSalvo.assinadoEm?.slice(0, 10))}</p>
          </div>
          <button className="btn-ghost" onClick={() => { if (confirm('Coletar nova assinatura? O termo atual será substituído.')) setTermoSalvo(null) }}>
            Reassinar
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>

        <div className="report">
          <div className="rep-h">Termo de Consentimento Livre e Esclarecido</div>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13.5, textAlign: 'justify' }}>{termoSalvo.texto}</p>
          <div style={{ marginTop: 28 }}>
            <img src={termoSalvo.assinatura} alt="Assinatura"
              style={{ maxWidth: 320, borderBottom: '1px solid var(--ink)' }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{paciente.nome}</div>
            <div className="text-sub" style={{ fontSize: 12 }}>
              Assinado digitalmente em {new Date(termoSalvo.assinadoEm).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Coleta de assinatura ───────────────────────────────────────────────
  return (
    <>
      <div className="flex-center gap-10" style={{ marginBottom: 18 }}>
        <button className="btn-ghost" onClick={() => nav(`/paciente/${pid}`)} style={{ padding: '9px 12px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Termo de Consentimento</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
          <div className="section-icon"><FileSignature size={16} /></div>
          <h2>Texto do termo</h2>
        </div>
        <textarea className="inp" rows={14} value={texto} onChange={e => setTexto(e.target.value)}
          style={{ fontSize: 13.5, lineHeight: 1.6 }} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={{ marginBottom: 10 }}>Assinatura do paciente</h2>
        <p className="text-sub" style={{ marginBottom: 10 }}>
          Peça para o paciente assinar com o dedo (celular/tablet) ou mouse no quadro abaixo.
        </p>
        <canvas ref={canvasRef} width={640} height={200}
          style={{ width: '100%', maxWidth: 640, height: 200, border: '2px dashed var(--border)', borderRadius: 12, background: '#fff', touchAction: 'none', cursor: 'crosshair' }} />
        <div className="flex gap-10 mt-12">
          <button className="btn-ghost" onClick={limpar}><Eraser size={15} /> Limpar</button>
          <button className="btn-primary" onClick={salvar} disabled={salvando || !temAssinatura}>
            {salvando ? <span className="spinner" /> : <Check size={16} />} Salvar termo assinado
          </button>
        </div>
      </div>
    </>
  )
}
