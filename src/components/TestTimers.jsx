// src/components/TestTimers.jsx
// Cronômetros embutidos para os testes (Degrau/TC6, TSL 5 rep, TSL 1 min)
// + widget de importação de FC a partir de exportação do Polar.

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Upload, Check, AlertCircle, Plus, Minus } from 'lucide-react'
import { beepMinute, beepEnd, beepCheckpoint, beepTap } from '../utils/sound'
import { parsePolarText, calcularMinutos } from '../utils/polarImport'

function fmt(sec) {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

// ════════════════════════════════════════════════════════════════════════
// Cronômetro do teste de 6 minutos (Degrau / TC6) + recuperação
// ════════════════════════════════════════════════════════════════════════
export function SixMinuteTest({ onMinuteElapsed, onRecoveryCheckpoint }) {
  const [phase, setPhase] = useState('idle') // idle | running | finished | recovering | done
  const [elapsed, setElapsed] = useState(0)   // segundos decorridos na fase atual
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const lastMinuteRef = useRef(0)
  const lastCheckpointRef = useRef(null)

  function tick() {
    const now = (Date.now() - startRef.current) / 1000
    setElapsed(now)
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (phase === 'running' || phase === 'recovering') {
      startRef.current = Date.now() - elapsed * 1000
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }
  }, [phase])

  // Lógica do teste principal (countdown 6 min)
  useEffect(() => {
    if (phase !== 'running') return
    const minuteNow = Math.floor(elapsed / 60) + 1
    if (minuteNow > lastMinuteRef.current && minuteNow <= 6) {
      lastMinuteRef.current = minuteNow
      beepMinute()
      onMinuteElapsed?.(minuteNow)
    }
    if (elapsed >= 360) {
      beepEnd()
      setPhase('finished')
    }
  }, [elapsed, phase])

  // Lógica da recuperação (stopwatch até 3 min, com checkpoints)
  useEffect(() => {
    if (phase !== 'recovering') return
    if (elapsed >= 60 && lastCheckpointRef.current === null) {
      lastCheckpointRef.current = 'rec1'
      beepCheckpoint()
      onRecoveryCheckpoint?.('rec1')
    }
    if (elapsed >= 180 && lastCheckpointRef.current === 'rec1') {
      lastCheckpointRef.current = 'rec3'
      beepCheckpoint()
      onRecoveryCheckpoint?.('rec3')
    }
  }, [elapsed, phase])

  function iniciar() {
    setElapsed(0); lastMinuteRef.current = 0
    setPhase('running')
  }
  function iniciarRecuperacao() {
    setElapsed(0); lastCheckpointRef.current = null
    setPhase('recovering')
  }
  function resetar() {
    cancelAnimationFrame(rafRef.current)
    setElapsed(0); lastMinuteRef.current = 0; lastCheckpointRef.current = null
    setPhase('idle')
  }

  const restante = phase === 'running' ? Math.max(0, 360 - elapsed) : null
  const minutoAtual = phase === 'running' ? Math.min(6, Math.floor(elapsed / 60) + 1) : null

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 14 }} className="no-print">
      {phase === 'idle' && (
        <button className="btn-primary" onClick={iniciar}>
          <Play size={15} /> Iniciar cronômetro do teste (6 min)
        </button>
      )}

      {phase === 'running' && (
        <div>
          <div className="flex-center gap-10" style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
              {fmt(restante)}
            </div>
            <span className="tag tag-good">Minuto {minutoAtual} de 6</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${(elapsed/360)*100}%`, background: 'var(--teal)', transition: 'width .3s' }} />
          </div>
          <p className="text-sub" style={{ fontSize: 12.5, marginBottom: 8 }}>
            Registre FC/SpO₂/PAS/PAD/BORG/PSE da coluna "{minutoAtual}" agora.
          </p>
          <button className="btn-ghost" onClick={resetar} style={{ fontSize: 12.5, padding: '6px 10px' }}>
            <RotateCcw size={13} /> Cancelar
          </button>
        </div>
      )}

      {phase === 'finished' && (
        <div>
          <div className="flex-center gap-8" style={{ marginBottom: 10 }}>
            <Check size={16} color="var(--good)" />
            <span style={{ fontWeight: 650 }}>Teste concluído! Registre FC máx.</span>
          </div>
          <div className="flex gap-10">
            <button className="btn-primary" onClick={iniciarRecuperacao}>
              <Play size={15} /> Iniciar recuperação (1 e 3 min)
            </button>
            <button className="btn-ghost" onClick={resetar} style={{ fontSize: 13 }}>
              <RotateCcw size={13} /> Refazer teste
            </button>
          </div>
        </div>
      )}

      {phase === 'recovering' && (
        <div>
          <div className="flex-center gap-10" style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
              {fmt(elapsed)}
            </div>
            <span className="tag tag-neutral">
              {elapsed < 60 ? 'Aguardando 1 min' : elapsed < 180 ? 'Aguardando 3 min' : 'Concluído'}
            </span>
          </div>
          <p className="text-sub" style={{ fontSize: 12.5, marginBottom: 8 }}>
            {elapsed < 60 && 'Beep em 1:00 — registre a FC de recuperação de 1 minuto.'}
            {elapsed >= 60 && elapsed < 180 && 'Beep em 3:00 — registre a FC de recuperação de 3 minutos.'}
            {elapsed >= 180 && 'Checkpoints concluídos — pode finalizar.'}
          </p>
          <button className="btn-ghost" onClick={resetar} style={{ fontSize: 12.5, padding: '6px 10px' }}>
            <Check size={13} /> Finalizar
          </button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Cronômetro simples (contagem crescente) — TSL 5 repetições
// ════════════════════════════════════════════════════════════════════════
export function Stopwatch({ onUseValue }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  function tick() {
    setElapsed((Date.now() - startRef.current) / 1000)
    rafRef.current = requestAnimationFrame(tick)
  }

  function iniciar() {
    setElapsed(0)
    startRef.current = Date.now()
    setRunning(true)
    rafRef.current = requestAnimationFrame(tick)
  }
  function parar() {
    cancelAnimationFrame(rafRef.current)
    setRunning(false)
  }
  function resetar() {
    cancelAnimationFrame(rafRef.current)
    setElapsed(0); setRunning(false)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 10 }} className="no-print">
      <div className="flex-center gap-10" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
          {elapsed.toFixed(1)}s
        </div>
        {!running ? (
          <button className="btn-primary" onClick={iniciar} style={{ padding: '7px 14px' }}>
            <Play size={14} /> {elapsed > 0 ? 'Reiniciar' : 'Iniciar'}
          </button>
        ) : (
          <button className="btn-ghost" onClick={parar} style={{ padding: '7px 14px' }}>
            <Pause size={14} /> Parar
          </button>
        )}
      </div>
      {!running && elapsed > 0 && (
        <div className="flex gap-8">
          <button className="btn-soft" onClick={() => onUseValue(Math.round(elapsed * 10) / 10)}>
            <Check size={13} /> Usar {(Math.round(elapsed*10)/10)}s no campo
          </button>
          <button className="btn-ghost" onClick={resetar} style={{ fontSize: 12.5 }}>
            <RotateCcw size={13} /> Limpar
          </button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Cronômetro de 1 min com contador de repetições por toque — TSL 1 min
// ════════════════════════════════════════════════════════════════════════
export function RepCounterTimer({ onUseValue }) {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [count, setCount] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  function tick() {
    const now = (Date.now() - startRef.current) / 1000
    setElapsed(now)
    if (now >= 60) {
      beepEnd()
      setRunning(false)
      setDone(true)
      cancelAnimationFrame(rafRef.current)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function iniciar() {
    setElapsed(0); setCount(0); setDone(false)
    startRef.current = Date.now()
    setRunning(true)
    rafRef.current = requestAnimationFrame(tick)
  }
  function resetar() {
    cancelAnimationFrame(rafRef.current)
    setElapsed(0); setCount(0); setRunning(false); setDone(false)
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const restante = Math.max(0, 60 - elapsed)

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 10 }} className="no-print">
      {!running && !done && (
        <button className="btn-primary" onClick={iniciar}>
          <Play size={15} /> Iniciar TSL 1 min
        </button>
      )}

      {running && (
        <div>
          <div className="flex-center gap-10" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
              {fmt(restante)}
            </div>
            <span className="tag tag-good">{count} repetições</span>
          </div>
          <button
            onClick={() => { setCount(c => c + 1); beepTap() }}
            style={{
              width: '100%', padding: '20px', borderRadius: 14, border: 'none',
              background: 'var(--teal)', color: '#fff', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            + Repetição
          </button>
          <div className="flex gap-8" style={{ marginTop: 8 }}>
            <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setCount(c => Math.max(0, c - 1))}>
              <Minus size={13} /> Corrigir
            </button>
          </div>
        </div>
      )}

      {done && (
        <div>
          <div className="flex-center gap-8" style={{ marginBottom: 10 }}>
            <Check size={16} color="var(--good)" />
            <span style={{ fontWeight: 650 }}>Tempo finalizado — {count} repetições</span>
          </div>
          <div className="flex gap-10">
            <button className="btn-soft" onClick={() => onUseValue(count)}>
              <Check size={13} /> Usar {count} no campo
            </button>
            <button className="btn-ghost" onClick={resetar} style={{ fontSize: 13 }}>
              <RotateCcw size={13} /> Refazer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Importar FC a partir de exportação do Polar (CSV/TXT) — Degrau / TC6
// ════════════════════════════════════════════════════════════════════════
export function ImportarPolarFC({ onAplicar }) {
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null) // { minutos, rec1, rec3 }
  const [nomeArquivo, setNomeArquivo] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setErro(''); setPreview(null); setNomeArquivo(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parsePolarText(ev.target.result)
      if (!result.ok) { setErro(result.error); return }
      const calc = calcularMinutos(result.series)
      setPreview(calc)
    }
    reader.onerror = () => setErro('Não foi possível ler o arquivo.')
    reader.readAsText(file)
  }

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 14 }} className="no-print">
      <div className="flex-center gap-8" style={{ marginBottom: 8 }}>
        <Upload size={15} color="var(--teal-dark)" />
        <span style={{ fontWeight: 650, fontSize: 13.5 }}>Importar FC do Polar (CSV/TXT)</span>
      </div>
      <p className="text-sub" style={{ fontSize: 12, marginBottom: 10 }}>
        Exporte a sessão no Polar Flow ou Polar Beat como CSV e envie aqui — o sistema calcula
        a FC média de cada minuto e preenche a tabela automaticamente.
      </p>

      <label className="btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Upload size={14} /> {nomeArquivo || 'Selecionar arquivo'}
        <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
      </label>

      {erro && (
        <div className="flex-center gap-8" style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bad-bg)', color: 'var(--bad)', borderRadius: 8, fontSize: 12.5 }}>
          <AlertCircle size={14} /> {erro}
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 10 }}>
          <div className="text-sub" style={{ fontSize: 12, marginBottom: 6 }}>Prévia da FC por minuto:</div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {preview.minutos.map((v, i) => (
              <span key={i} className={`tag tag-${v ? 'neutral' : 'bad'}`}>
                Min {i+1}: {v ?? '—'}
              </span>
            ))}
            {preview.rec1 && <span className="tag tag-good">Rec1: {preview.rec1}</span>}
            {preview.rec3 && <span className="tag tag-good">Rec3: {preview.rec3}</span>}
          </div>
          <button className="btn-primary" onClick={() => onAplicar(preview)}>
            <Check size={15} /> Aplicar à tabela
          </button>
        </div>
      )}
    </div>
  )
}
