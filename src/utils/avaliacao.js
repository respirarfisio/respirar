// src/utils/avaliacao.js
// Estrutura de uma avaliação em branco — espelha todos os testes dos relatórios

export const SERIE_DEGRAU = ['1', '2', '3', '4', '5', '6', 'Rec1', 'Rec3']

export function avaliacaoVazia() {
  return {
    data: new Date().toISOString().slice(0, 10),
    medico: '',
    objetivo: '',

    // ── Teste do Degrau 6 min ──────────────────────────────────────────────
    degrau: {
      reps: '',
      preditoReps: '',   // sobrescreve o cálculo automático se preenchido
      fcMax: '',
      fcRec1: '',
      fcRec3: '',
      borgMax: '',
      pse: '',           // percepção de esforço membro inferior
      nParadas: '',
      obs: '',
      serie: SERIE_DEGRAU.map(t => ({
        t,
        fc: '', spo2: '', pas: '', pad: '', borg: '',
      })),
    },

    // ── Função muscular respiratória ───────────────────────────────────────
    pimax: { obtido: '', predito: '' },
    pemax: { obtido: '', predito: '' },

    // ── S-Index (Meldrum et al.) ───────────────────────────────────────────
    sindex: { obtido: '', predito: '' },

    // ── Função muscular periférica ─────────────────────────────────────────
    grip:  { obtido: '', predito: '', mao: 'Dominante' },
    sts5:  { tempo: '', predito: '' },  // segundos — menor = melhor
    sts1:  { reps: '',  predito: '' },

    // ── SPPB (Short Physical Performance Battery) ─────────────────────────
    sppb: {
      velocidadeMarcha: '',  // segundos para 4 m
      equilibrioPesJuntos: '',
      equilibrioUmPeFrente: '',
      equilibrioHalux: '',
    },

    // ── Conclusão ──────────────────────────────────────────────────────────
    conclusao: '',
    profissional: 'Dr. Ravel Marinho — CREFITO 1 nº 216.212 F',
  }
}

// Formata ISO para dd/mm/aaaa
export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
