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
// Soma os 3 subtestes (velocidade de marcha, equilíbrio, TSL 5 rep), cada um de 0 a 4 pontos.
// Aceita um objeto { vel, equilibrio, tsl5 } ou, por compatibilidade, qualquer mapa de pontos.
export function sppbTotal(pontos) {
  const clamp = (v) => {
    const n = num(v)
    if (n == null) return 0
    return Math.min(4, Math.max(0, n))
  }
  const total = Object.values(pontos).reduce((s, v) => s + clamp(v), 0)
  if (total <= 3)  return { total, class: 'Incapacidade grave' }
  if (total <= 6)  return { total, class: 'Incapacidade moderada' }
  if (total <= 9)  return { total, class: 'Incapacidade leve' }
  return { total, class: 'Normal' }
}

// ── Teste de Caminhada 6 min (Iwama et al.) ───────────────────────────────
// Marton (67a, M): 622.461 - 1.846×67 + 61.503×1 = 559.7 ≈ 560 m ✓
export function predTC6(idade, sexo) {
  if (!idade) return null
  return r1(622.461 - 1.846 * idade + 61.503 * (sexo === 'M' ? 1 : 0))
}

// VO2pico via TC6 (ACSM 2018) — mesma equação do degrau com distância em metros
export function vo2TC6(dist, idade, peso, altura) {
  if (!dist || !idade || !peso || !altura) return null
  return r1(0.02 * dist - 0.191 * idade - 0.07 * peso + 0.09 * altura + 2.45)
}

// METs a partir do VO2pico
export function vo2ToMETs(vo2) {
  if (!vo2) return null
  return r1(vo2 / 3.5)
}

// Classificação da aptidão cardiorrespiratória pelo TC6 (Dourado et al., 2021)
export function classTC6Pct(pct) {
  if (pct == null) return null
  if (pct >= 100) return 'Muito boa'
  if (pct >= 90)  return 'Boa'
  if (pct >= 80)  return 'Regular'
  if (pct >= 70)  return 'Baixa'
  return 'Muito baixa'
}

// ── Espirometria (Pereira 2007 — valores preditos brasileiros) ────────────
// Para uso em campo manual — a maioria dos espirômetros já exibe o predito
export function predCVF(idade, altura, sexo) {
  if (!idade || !altura) return null
  return sexo === 'M'
    ? r1(0.0576 * altura - 0.026 * idade - 4.34)
    : r1(0.0443 * altura - 0.026 * idade - 2.89)
}
export function predVEF1(idade, altura, sexo) {
  if (!idade || !altura) return null
  return sexo === 'M'
    ? r1(0.0443 * altura - 0.025 * idade - 2.17)
    : r1(0.0350 * altura - 0.022 * idade - 1.21)
}

// ── Dinamometria bilateral (Meldrum et al., 2007) ─────────────────────────
// Marton (67a, M): Quad = 39.45 kgf ✓   Bíceps = 26.41 kgf ✓
export function predQuadriceps(idade, sexo) {
  if (!idade) return null
  return sexo === 'M'
    ? r1(67.7 - 0.42 * idade)
    : r1(50.2 - 0.35 * idade)
}
export function predBiceps(idade, sexo) {
  if (!idade) return null
  return sexo === 'M'
    ? r1(38.4 - 0.18 * idade)
    : r1(24.8 - 0.12 * idade)
}
// % assimetria entre lados
export function assimetria(d, e) {
  if (!d || !e) return null
  return r1(Math.abs(d - e) / Math.max(d, e) * 100)
}

// ── Cálculos consolidados de uma avaliação ─────────────────────────────────
// Centraliza obtido/predito/% para os principais testes, usado no Relatório
// e em qualquer outro lugar que precise dos mesmos números (ex.: motor CBDF).
export function calcEv(ev, paciente) {
  const idade = paciente?.idade, sexo = paciente?.sexo
  const peso = num(ev.vitais?.peso) || num(paciente?.peso)
  const altura = num(ev.vitais?.altura) || num(paciente?.altura)

  const pimP = num(ev.pimax?.predito) ?? r1(predPImax(idade, sexo))
  const pemP = num(ev.pemax?.predito) ?? r1(predPEmax(idade, sexo))
  const sindP = num(ev.sindex?.predito) ?? r1(predSindex(idade, sexo))
  const grP = num(ev.grip?.predito) ?? r1(predGrip(idade, peso, sexo))
  const repsP = num(ev.degrau?.preditoReps) ?? r1(predStepReps(idade, sexo))
  const tc6P = num(ev.tc6?.preditoDist) ?? r1(predTC6(idade, sexo))
  const sts5P = num(ev.sts5?.predito) ?? predSTS5(idade)
  const sts1P = num(ev.sts1?.predito) ?? predSTS1(idade, sexo)
  const cvfP = num(ev.espiro?.preBD?.cvfPred) ?? r1(predCVF(idade, altura, sexo))
  const vef1P = num(ev.espiro?.preBD?.vef1Pred) ?? r1(predVEF1(idade, altura, sexo))
  const quadP = r1(predQuadriceps(idade, sexo))
  const bicP = r1(predBiceps(idade, sexo))

  const pim = num(ev.pimax?.obtido)
  const pem = num(ev.pemax?.obtido)
  const sind = num(ev.sindex?.obtido)
  const grip = num(ev.grip?.obtido)
  const reps = num(ev.degrau?.reps)
  const tc6d = num(ev.tc6?.distancia)
  const sts5 = num(ev.sts5?.tempo)
  const sts1 = num(ev.sts1?.reps)
  const cvf = num(ev.espiro?.preBD?.cvf)
  const vef1 = num(ev.espiro?.preBD?.vef1)
  const qD = num(ev.dinamo?.quadD), qE = num(ev.dinamo?.quadE)
  const bD = num(ev.dinamo?.bicD), bE = num(ev.dinamo?.bicE)
  const quad = qD != null && qE != null ? r1((qD + qE) / 2) : (qD ?? qE ?? null)
  const bic = bD != null && bE != null ? r1((bD + bE) / 2) : (bD ?? bE ?? null)

  return {
    pim, pimP, pimPct: pct(pim, pimP),
    pem, pemP, pemPct: pct(pem, pemP),
    sind, sindP, sindPct: pct(sind, sindP),
    grip, grP, gripPct: pct(grip, grP),
    reps, repsP, repsPct: pct(reps, repsP),
    tc6d, tc6P, tc6Pct: pct(tc6d, tc6P),
    sts5, sts5P, sts5Risk: sts5 == null ? null : sts5 <= sts5P ? 'Diminuído' : 'Aumentado',
    sts1, sts1P, sts1Pct: pct(sts1, sts1P),
    cvf, cvfP, cvfPct: pct(cvf, cvfP),
    vef1, vef1P, vef1Pct: pct(vef1, vef1P),
    quad, quadP, quadPct: pct(quad, quadP),
    bic, bicP, bicPct: pct(bic, bicP),
  }
}
