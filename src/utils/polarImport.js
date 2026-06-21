// src/utils/polarImport.js
// Lê arquivos exportados do Polar Flow / Polar Beat (CSV ou TXT) e extrai a
// série de frequência cardíaca por segundo, calculando a média por minuto
// para preencher automaticamente a tabela do Degrau / TC6.

// Tenta separar por vírgula, ponto-e-vírgula ou tab — formatos variam por país
function splitLine(line) {
  if (line.includes(';')) return line.split(';')
  if (line.includes('\t')) return line.split('\t')
  return line.split(',')
}

// Converte texto de tempo em segundos. Aceita "hh:mm:ss", "mm:ss" ou número puro.
function parseTimeToSeconds(txt) {
  if (txt == null) return null
  const t = String(txt).trim()
  if (/^\d+$/.test(t)) return Number(t)
  const parts = t.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

function findColumnIndex(headerCols, patterns) {
  const norm = headerCols.map(h => h.toLowerCase().trim())
  for (const pat of patterns) {
    const idx = norm.findIndex(h => h.includes(pat))
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Lê o conteúdo textual de um export do Polar e retorna a série {t, hr}.
 * Aceita exports do Polar Flow (sessão de treino) e do Polar Beat.
 */
export function parsePolarText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)

  // Procura a linha de cabeçalho — precisa ter uma coluna de tempo e uma de FC
  let headerIdx = -1, timeIdx = -1, hrIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const tIdx = findColumnIndex(cols, ['time', 'tempo', 'sample time'])
    const hIdx = findColumnIndex(cols, ['hr (bpm)', 'heart rate', 'frequência', 'frequencia', 'fc (bpm)', 'hr'])
    if (tIdx !== -1 && hIdx !== -1) {
      headerIdx = i; timeIdx = tIdx; hrIdx = hIdx
      break
    }
  }

  if (headerIdx === -1) {
    // fallback: sem cabeçalho reconhecível — tenta 2 colunas numéricas simples
    const sample = splitLine(lines[Math.min(1, lines.length - 1)] || '')
    if (sample.length < 2) return { ok: false, error: 'Não foi possível identificar as colunas de tempo e FC no arquivo.' }
    timeIdx = 0; hrIdx = 1; headerIdx = -1
  }

  const series = []
  const start = headerIdx + 1
  for (let i = Math.max(start, 0); i < lines.length; i++) {
    const cols = splitLine(lines[i])
    if (cols.length <= Math.max(timeIdx, hrIdx)) continue
    const t = parseTimeToSeconds(cols[timeIdx])
    const hr = Number(String(cols[hrIdx]).replace(',', '.').trim())
    if (t == null || isNaN(hr) || hr <= 0) continue
    series.push({ t, hr: Math.round(hr) })
  }

  if (series.length < 5) {
    return { ok: false, error: 'Poucas amostras de FC encontradas — confira se o arquivo é o export correto do Polar.' }
  }

  // Se o tempo não veio em segundos crescentes reais (ex: sem coluna de tempo),
  // assume 1 amostra por segundo a partir de 0.
  const semTempoReal = series.every((s, i) => s.t === series[i].t) && series[0].t === series[1]?.t
  if (semTempoReal) series.forEach((s, i) => { s.t = i })

  return { ok: true, series }
}

/**
 * Calcula a média de FC dentro de uma janela de tempo [from, to) segundos.
 */
function avgInWindow(series, from, to) {
  const pts = series.filter(s => s.t >= from && s.t < to)
  if (!pts.length) return null
  return Math.round(pts.reduce((s, p) => s + p.hr, 0) / pts.length)
}

/**
 * A partir da série completa, calcula a FC média de cada um dos 6 minutos
 * do teste, além dos checkpoints de recuperação em 1 min e 3 min após o fim.
 * Assume que o teste começa em t=0 da série (ajustável via offsetInicio).
 */
export function calcularMinutos(series, offsetInicio = 0) {
  const minutos = []
  for (let m = 0; m < 6; m++) {
    minutos.push(avgInWindow(series, offsetInicio + m * 60, offsetInicio + (m + 1) * 60))
  }
  const fimTeste = offsetInicio + 360
  const rec1 = avgInWindow(series, fimTeste + 50, fimTeste + 70)   // janela ±10s ao redor de 1min
  const rec3 = avgInWindow(series, fimTeste + 170, fimTeste + 190) // janela ±10s ao redor de 3min
  return { minutos, rec1, rec3 }
}
