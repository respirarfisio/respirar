// src/pages/TermoImagem.jsx — Termo de Consentimento para uso de imagens (ANEXO I)
// com a identidade da Respirar Fisioterapeutas e assinatura digital no celular.
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eraser, Check, Printer, Image as ImageIcon } from 'lucide-react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getPaciente } from '../utils/db'
import { fmtDate } from '../utils/avaliacao'

// Dados do profissional/clínica que constam por padrão no termo.
// Edite aqui se o profissional responsável mudar.
const PROFISSIONAL_PADRAO = 'Dr. Ravel Marinho — CREFITO 1 nº 216.212 F'
const CLINICA_ENDERECO = 'Av. Hermes da Fonseca, 390 — Lj 05, Petrópolis, Natal/RN'

const TEXTO_PADRAO = (paciente) => {
  const end = paciente?.endereco ?? {}
  const enderecoLinha = [end.logradouro, end.numero].filter(Boolean).join(', ')
  const complementoBairro = [end.complemento, end.bairro].filter(Boolean).join(', ')
  const cidadeLinha = [end.cidade, end.uf].filter(Boolean).join('/')

  return `Eu, ${paciente?.nome || '____________________'}, CPF ${paciente?.cpf || '________________'}, residente à ${enderecoLinha || '____________________'}${complementoBairro ? `, ${complementoBairro}` : ''}${cidadeLinha ? `, na cidade de ${cidadeLinha}` : ''}, por meio deste Termo de Consentimento Livre e Esclarecido, consinto que o(a) Dr(a). ${PROFISSIONAL_PADRAO}, da Respirar Fisioterapeutas (${CLINICA_ENDERECO}), tire fotografias, faça vídeos e outros tipos de imagens de mim, sobre o meu caso clínico.

Consinto que estas imagens sejam utilizadas para finalidade didática e científica, divulgadas em aulas, palestras, conferências, cursos, congressos, etc., e também publicadas em livros, artigos, portais de internet, redes sociais, revistas científicas e similares, podendo inclusive ser mostrado o meu rosto, o que pode fazer com que eu seja reconhecido(a).

Consinto também que as imagens de meus exames, como radiografias, tomografias computadorizadas, ressonâncias magnéticas, ultrassons, eletromiografias, histopatológicos (exame no microscópio da peça cirúrgica retirada) e outros, sejam utilizadas e divulgadas.

Consinto igualmente que o uso das minhas imagens e resultados de exames possam ser veiculados em campanhas de natureza comercial, com a finalidade de divulgar o trabalho da Respirar Fisioterapeutas e do profissional acima identificado, sem que nada possa ser reclamado, a título de danos morais ou materiais, em razão da referida divulgação.

Este consentimento pode ser revogado, sem qualquer ônus ou prejuízo à minha pessoa, a meu pedido ou solicitação, desde que a revogação ocorra antes da publicação. Fui esclarecido(a) de que não receberei nenhum ressarcimento ou pagamento pelo uso das minhas imagens.

Declaro que li, compreendi e concordo com os termos acima, e que recebi uma via deste termo (disponível digitalmente nesta plataforma).`
}

export default function TermoImagem() {
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
      setTexto(TEXTO_PADRAO(p))
      const snap = await getDoc(doc(db, 'pacientes', pid, 'documentos', 'termo-imagem'))
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
    await setDoc(doc(db, 'pacientes', pid, 'documentos', 'termo-imagem'), dados)
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
            <h1>Termo de Imagem</h1>
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
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 18, letterSpacing: .3 }}>
              re<span style={{ color: 'var(--teal)' }}>spir</span>ar
            </div>
            <div style={{ color: '#9FB0C9', fontSize: 10, letterSpacing: 3 }}>FISIOTERAPEUTAS</div>
          </div>
          <div className="rep-h">Termo de Consentimento Livre e Esclarecido para Uso de Imagens</div>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13.5, textAlign: 'justify' }}>{termoSalvo.texto}</p>
          <div style={{ marginTop: 28 }}>
            <img src={termoSalvo.assinatura} alt="Assinatura"
              style={{ maxWidth: 320, borderBottom: '1px solid var(--ink)' }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{paciente.nome}</div>
            {paciente.cpf && <div className="text-sub" style={{ fontSize: 12 }}>CPF: {paciente.cpf}</div>}
            <div className="text-sub" style={{ fontSize: 12 }}>
              Assinado digitalmente em {new Date(termoSalvo.assinadoEm).toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="text-sub" style={{ marginTop: 20, fontSize: 11.5, textAlign: 'center' }}>
            Respirar Fisioterapeutas · {CLINICA_ENDERECO}
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
          <h1>Termo de Imagem</h1>
          <p className="text-sub">{paciente.nome}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="flex-center gap-10" style={{ marginBottom: 12 }}>
          <div className="section-icon"><ImageIcon size={16} /></div>
          <h2>Texto do termo (autorização de uso de imagens)</h2>
        </div>
        <p className="text-sub" style={{ marginBottom: 10, fontSize: 12.5 }}>
          Texto pré-preenchido com os dados do cadastro do paciente. Revise e ajuste se necessário antes de coletar a assinatura.
        </p>
        <textarea className="inp" rows={16} value={texto} onChange={e => setTexto(e.target.value)}
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
