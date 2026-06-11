// src/utils/avaliacao.js
// Estrutura de uma avaliaÃ§Ã£o em branco â€” espelha todos os testes dos relatÃ³rios

export const SERIE_DEGRAU = ['1', '2', '3', '4', '5', '6', 'Rec1', 'Rec3']

export function avaliacaoVazia() {
  return {
    data: new Date().toISOString().slice(0, 10),
    medico: '',
    objetivo: '',

    // â”€â”€ Teste do Degrau 6 min â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    degrau: {
      reps: '',
      preditoReps: '',   // sobrescreve o cÃ¡lculo automÃ¡tico se preenchido
      fcMax: '',
      fcRec1: '',
      fcRec3: '',
      borgMax: '',
      pse: '',           // percepÃ§Ã£o de esforÃ§o membro inferior
      nParadas: '',
      obs: '',
      serie: SERIE_DEGRAU.map(t => ({
        t,
        fc: '', spo2: '', pas: '', pad: '', borg: '',
      })),
    },

    // â”€â”€ FunÃ§Ã£o muscular respiratÃ³ria â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    pimax: { obtido: '', predito: '' },
    pemax: { obtido: '', predito: '' },

    // â”€â”€ S-Index (Meldrum et al.) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sindex: { obtido: '', predito: '' },

    // â”€â”€ FunÃ§Ã£o muscular perifÃ©rica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    grip:  { obtido: '', predito: '', mao: 'Dominante' },
    sts5:  { tempo: '', predito: '' },  // segundos â€” menor = melhor
    sts1:  { reps: '',  predito: '' },

    // â”€â”€ SPPB (Short Physical Performance Battery) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sppb: {
      velocidadeMarcha: '',  // segundos para 4 m
      equilibrioPesJuntos: '',
      equilibrioUmPeFrente: '',
      equilibrioHalux: '',
    },

    // â”€â”€ ConclusÃ£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    conclusao: '',
    profissional: 'Dr. Ravel Marinho â€” CREFITO 1 nÂº 216.212 F',
  }
}

// Formata ISO para dd/mm/aaaa
export function fmtDate(iso) {
  if (!iso) return 'â€”'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
