// src/utils/sound.js — beeps gerados via Web Audio API (sem arquivos de áudio)

let audioCtx = null
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function beep(freq = 880, duration = 150) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000)
    osc.start(now)
    osc.stop(now + duration / 1000 + 0.02)
  } catch {}
}

// Beep curto a cada minuto — sinaliza "registre os valores desta linha"
export function beepMinute() { beep(880, 150) }

// Beep duplo, mais grave — fim do teste principal
export function beepEnd() {
  beep(660, 220)
  setTimeout(() => beep(880, 320), 260)
}

// Beep de checkpoint de recuperação (Rec 1 / Rec 3)
export function beepCheckpoint() {
  beep(990, 180)
  setTimeout(() => beep(990, 180), 220)
}

// Beep curtinho — toque/contagem de repetição
export function beepTap() { beep(1200, 55) }
