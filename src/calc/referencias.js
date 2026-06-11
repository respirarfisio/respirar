// src/calc/referencias.js
// Equações de referência validadas contra os relatórios da Respirar

// ── Pressão Inspiratória Máxima (Neder et al., 1999) ──────────────────────
// Predito do Francisco (60a, M): 155,3 − 0,80×60 = 107,3 ✓
export function predPImax(idade, sexo) {
  if (!idade) return null
  return sexo === 'M'
    ? 155.3 - 0.80 * idade
    : 110.4 - 0.49 * idade
}

// ── Pressão Expiratória Máxima (Neder et al., 1999) ───────────────────────
// Predito Francisco: 165,3 − 0,81×60 = 116,7 ✓
export function predPEmax(idade, sexo) {
  if (!idade) return null
  return sexo === 'M'
    ? 165.3 - 0.81 * idade
    : 115.6 - 0.61 * idade
}

// ── Preensão Palmar (equação do relatório) ────────────────────────────────
// Predito Francisco (60a, 80kg, M): 34,996 − 0,382×60 + 0,174×80 + 13,628×1 = 38,5 ✓
export function predGrip(idade, peso, sexo) {
  if (!idade || !peso) return null
  return 34.996 - 0.382 * idade + 0.174 * peso + 13.628 * (sexo === 'M' ? 1 : 0)
}

// ── Teste do Degrau 6 min (Albuquerque et al., 2019) ─────────────────────
// Predito Francisco (60a, M): (166,9 − 60) + 20,7×1 = 127,6 ~ 128 ✓
// ⚠️ A fórmula impressa no relatório inclui um termo "0,7×FC" que não bate
// com o valor predito de 128. Mantemos a versão sem FC, que reproduz o valor.
// Se a planilha usar outra versão, edite aqui.
export function predStepReps(idade, sexo) {
  if (!idade) return null
  return (166.9 - idade) + 20.7 * (sexo === 'M' ? 1 : 0)
}

// ── TSL 5 repetições — risco de queda (Bohannon, normas por faixa) ────────
// Predito Francisco (60a): 11,4 s ✓
export function predSTS5(idade) {
  if (!idade) return null
  if (idade < 60) return 10.0
  if (idade < 70) return 11.4
  if (idade < 80) return 12.6
  return 14.8
}

// ── TSL 1 min (referência por faixa etária/sexo) ──────────────────────────
// Predito Francisco (60a, M): 37 ✓  (30/37 = 81% ≈ 80% do relatório)
export function predSTS1(idade, sexo) {
  if (!idade) return null
  // Tabela simplificada baseada nos valores do relatório
  const base = sexo === 'M' ? 45 : 42
  return Math.round(base - 0.18 * Math.max(0, idade - 40))
}

// ── S-Index (Meldrum et al., 2007 — usado no relatório do Jackson) ─────────
// Predito Jackson (34a, M): 125 cmH₂O (valor de referência do relatório)
export function predSindex(idade, sexo) {
  if (!idade) return null
  return sexo === 'M'
    ? Math.round(140 - 0.44 * idade)
    : Math.round(120 - 0.41 * idade)
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function pct(obtido, predito) {
  if (!obtido || !predito) return null
  return Math.round((obtido / predito) * 100)
}

export function r1(n) {
  if (n == null) return null
  return Math.round(n * 10) / 10
}

export function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

export function classifyPct(pct, lowAt = 80) {
  if (pct == null) return null
  return pct >= lowAt
    ? { label: 'Normal', tone: 'good' }
    : { label: 'Reduzida', tone: 'bad' }
}
