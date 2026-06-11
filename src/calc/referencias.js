// src/calc/referencias.js — Equações validadas contra relatórios + planilha

export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n }
export const r1  = (n) => n == null ? null : Math.round(n * 10) / 10
export const r2  = (n) => n == null ? null : Math.round(n * 100) / 100
export const pct = (o, p) => (!o || !p) ? null : Math.round((o / p) * 100)

// ── Dados vitais ──────────────────────────────────────────────────────────
export function calcIMC(peso, altura) {
  if (!peso || !altura) return null
  return r2(peso / ((altura / 100) ** 2))
}
export function classIMC(imc) {
  if (!imc) return ''
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25)   return 'Peso normal'
  if (imc < 30)   return 'Sobrepeso'
  if (imc < 35)   return 'Obesidade grau I'
  if (imc < 40)   return 'Obesidade grau II'
  return 'Obesidade grau III'
}
export function fcMaxTanaka(idade) {
  if (!idade) return null
  return r1(208 - 0.7 * idade)   // Tanaka et al.
}

// ── VO2 predito ───────────────────────────────────────────────────────────
export function vo2PreditoM(idade, peso, altura) {
  // Equação masculina brasileira (planilha VO2predito H)
  if (!idade || !peso || !altura) return null
  return r1(50.72 - 0.372 * idade)
}
export function vo2PreditoF(idade, peso, altura) {
  if (!idade || !peso || !altura) return null
  return r1(22.78 - 0.17 * idade)
}

// ── Pressão Inspiratória Máxima (Neder et al., 1999) ─────────────────────
// Francisco (60a, M): 155.3 − 0.80×60 = 107.3 ✓
export function predPImax(idade, sexo) {
  if (!idade) return null
  return r1(sexo === 'M' ? 155.3 - 0.80 * idade : 110.4 - 0.49 * idade)
}

// ── Pressão Expiratória Máxima (Neder et al., 1999) ──────────────────────
// Francisco (60a, M): 165.3 − 0.81×60 = 116.7 ✓
export function predPEmax(idade, sexo) {
  if (!idade) return null
  return r1(sexo === 'M' ? 165.3 - 0.81 * idade : 115.6 - 0.61 * idade)
}

// ── Preensão Palmar (equação do relatório) ────────────────────────────────
// Francisco (60a, 80kg, M): 34.996 − 0.382×60 + 0.174×80 + 13.628 = 38.5 ✓
export function predGrip(idade, peso, sexo) {
  if (!idade || !peso) return null
  return r1(34.996 - 0.382 * idade + 0.174 * peso + 13.628 * (sexo === 'M' ? 1 : 0))
}

// ── Teste do Degrau 6 min (Albuquerque et al., 2019) ─────────────────────
// Francisco (60a, M): (166.9 − 60) + 20.7 = 127.6 ~ 128 ✓
// Nota: a fórmula completa inclui 0.7×FC mas não reproduz o predito do relatório sem FC basal
export function predStepReps(idade, sexo) {
  if (!idade) return null
  return r1((166.9 - idade) + 20.7 * (sexo === 'M' ? 1 : 0))
}

// ── VO2 pico estimado pelo TD6 (ACSM 2018) ───────────────────────────────
// VO2pico = (0.02 × dist[m]) − (0.191 × idade) − (0.07 × peso) + (0.09 × altura) + (0.26 × PTP×10⁻³) + 2.45
export function vo2ACSMdegrau(reps, idade, peso, altura) {
  if (!reps || !idade || !peso || !altura) return null
  const dist = reps * 0.40  // cada subida+descida = 40cm de deslocamento vertical equivalente
  return r1(0.02 * dist - 0.191 * idade - 0.07 * peso + 0.09 * altura + 2.45)
}

// ── TSL 5 repetições (Bohannon) ───────────────────────────────────────────
// Francisco (60a): 11.4 s ✓
export function predSTS5(idade) {
  if (!idade) return null
  if (idade < 60) return 10.0
  if (idade < 70) return 11.4
  if (idade < 80) return 12.6
  return 14.8
}

// ── TSL 1 min ─────────────────────────────────────────────────────────────
// Francisco (60a, M): 37 ✓
export function predSTS1(idade, sexo) {
  if (!idade) return null
  const base = sexo === 'M' ? 45 : 42
  return Math.round(base - 0.18 * Math.max(0, idade - 40))
}

// ── S-Index (Meldrum et al., 2007) ────────────────────────────────────────
// Jackson (34a, M): 125 ✓ (ref = 125 da planilha)
export function predSindex(idade, sexo) {
  if (!idade) return null
  return r1(sexo === 'M' ? 140 - 0.44 * idade : 120 - 0.41 * idade)
}

// ── Circunferências e RCQ ─────────────────────────────────────────────────
export function calcRCQ(cintura, quadril) {
  if (!cintura || !quadril) return null
  return r2(cintura / quadril)
}
export function classRCQ(rcq, sexo) {
  if (!rcq) return ''
  if (sexo === 'M') {
    if (rcq < 0.90) return 'Baixo Risco'
    if (rcq < 0.95) return 'Risco Moderado'
    return 'Alto Risco'
  } else {
    if (rcq < 0.80) return 'Baixo Risco'
    if (rcq < 0.85) return 'Risco Moderado'
    return 'Alto Risco'
  }
}

// ── SPPB ──────────────────────────────────────────────────────────────────
export function sppbTotal(pontos) {
  const total = Object.values(pontos).reduce((s, v) => s + (num(v) ?? 0), 0)
  if (total <= 3)  return { total, class: 'Incapacidade grave' }
  if (total <= 6)  return { total, class: 'Incapacidade moderada' }
  if (total <= 9)  return { total, class: 'Incapacidade leve' }
  return { total, class: 'Normal' }
}
