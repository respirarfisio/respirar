// src/utils/avaliacao.js

export const SERIE_DEGRAU = ['1','2','3','4','5','6','Rec1','Rec3']

export function avaliacaoVazia() {
  return {
    data: new Date().toISOString().slice(0,10),
    medico: '',
    objetivo: '',

    // Dados vitais
    vitais: { fc: '', fr: '', pas: '', pad: '', spo2: '', peso: '', altura: '' },

    // Degrau
    degrau: {
      reps: '', preditoReps: '',
      fcMax: '', fcRec1: '', fcRec3: '',
      borgMax: '', pse: '', nParadas: '', obs: '',
      arritmia: false, interrupcao: false, broncoespasmo: false, dessaturacao: false,
      serie: SERIE_DEGRAU.map(t => ({ t, fc:'', spo2:'', pas:'', pad:'', borg:'', pse:'' })),
      imagens: [],  // { nome, base64, tipo }
    },

    // Função respiratória
    pimax:  { obtido:'', predito:'' },
    pemax:  { obtido:'', predito:'' },
    sindex: { obtido:'', predito:'' },

    // Periférica
    grip: { obtido:'', predito:'', mao:'Dominante' },
    sts5: { tempo:'', predito:'' },
    sts1: { reps:'',  predito:'' },

    // SPPB
    sppb: {
      velMarcha4m: '',
      pontoVel: '',
      peJuntos: '',
      pontoPeJuntos: '',
      umPeFrente: '',
      pontoUmPe: '',
      haluxCalcanhar: '',
      pontoHalux: '',
      tsl5ponto: '',
    },

    // Ficha funcional extra (planilha)
    ficha: {
      nyha: '',
      etnia: '',
      nivelAtividade: '',  // 1=sedentário/2=ativo/3=atleta
      cintura: '',
      quadril: '',
      panturrilha: '',
      // TC6
      tc6Dist: '', tc6Spo2Ini: '', tc6Spo2Fim: '', tc6FcIni: '', tc6FcFim: '', tc6BorgIni: '', tc6BorgFim: '', tc6FcMax: '', tc6PasMax: '',
      // Capacidade vital
      cvAtingido: '',
    },

    conclusao: '',
    conclusaoIA: '',
    profissional: 'Dr. Ravel Marinho — CREFITO 1 nº 216.212 F',
  }
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function borgLabel(v) {
  const n = parseFloat(v)
  if (isNaN(n)) return ''
  if (n <= 1)  return 'Muito fraco'
  if (n <= 2)  return 'Fraco'
  if (n <= 4)  return 'Moderado'
  if (n <= 6)  return 'Forte'
  if (n <= 8)  return 'Muito forte'
  if (n <= 9)  return 'Quase máximo'
  return 'Máximo'
}
