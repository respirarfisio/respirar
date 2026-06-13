// src/utils/avaliacao.js

export const SERIE_DEGRAU = ['1','2','3','4','5','6','Rec1','Rec3']
export const SERIE_TC6    = ['1','2','3','4','5','6','Rec1','Rec3']

// Todos os testes disponíveis com metadados
export const TESTES_DISPONIVEIS = [
  { id: 'vitais',   label: 'Dados Vitais e Composição Corporal', sempre: true },
  { id: 'degrau',   label: 'Teste do Degrau 6 min' },
  { id: 'tc6',      label: 'Teste de Caminhada 6 min (TC6)' },
  { id: 'espiro',   label: 'Espirometria Forçada' },
  { id: 'pimax',    label: 'PImáx / PEmáx (Manovacuometria)' },
  { id: 'sindex',   label: 'S-Index (Força Inspiratória Dinâmica)' },
  { id: 'grip',     label: 'Preensão Palmar' },
  { id: 'dinamo',   label: 'Dinamometria Bilateral (Quadríceps / Bíceps)' },
  { id: 'sts5',     label: 'TSL 5 repetições' },
  { id: 'sts1',     label: 'TSL 1 min' },
  { id: 'sppb',     label: 'SPPB' },
]

export function avaliacaoVazia() {
  return {
    data: new Date().toISOString().slice(0,10),
    medico: '',
    objetivo: '',

    // Testes ativos (selecionados pelo usuário)
    testesAtivos: ['vitais','degrau','pimax','sindex','grip','sts5','sts1'],

    // Dados vitais
    vitais: { fc:'', fr:'', pas:'', pad:'', spo2:'', peso:'', altura:'' },

    // Degrau 6 min
    degrau: {
      reps:'', preditoReps:'',
      fcMax:'', fcRec1:'', fcRec3:'',
      borgMax:'', pse:'', nParadas:'', obs:'',
      arritmia: false, interrupcao: false, broncoespasmo: false, dessaturacao: false,
      serie: SERIE_DEGRAU.map(t => ({ t, fc:'', spo2:'', pas:'', pad:'', borg:'', pse:'' })),
      imagens: [],
    },

    // TC6 — Teste de Caminhada 6 min
    tc6: {
      distancia:'', preditoDist:'',          // metros
      fcIni:'', fcFim:'', fcMax:'', fcRec1:'', fcRec3:'',
      spo2Ini:'', spo2Fim:'',
      pasIni:'', pasFim:'', padIni:'', padFim:'',
      borgIni:'', borgFim:'', pseIni:'', pseFim:'',
      nParadas:'', obs:'', imagens:[],
      serie: SERIE_TC6.map(t => ({ t, fc:'', spo2:'', pas:'', pad:'', borg:'', pse:'' })),
    },

    // Espirometria
    espiro: {
      equipamento:'', referencia:'Pereira (2007)',
      preBD: { cvf:'', cvfPred:'', vef1:'', vef1Pred:'', rel:'', relPred:'' },
      posBD: { cvf:'', vef1:'', rel:'' },
      temPosBD: false,
      achados:'', classificacao:'',
      imagens:[],   // curvas F-V e V-T
    },

    // PImáx / PEmáx
    pimax: { obtido:'', predito:'' },
    pemax: { obtido:'', predito:'' },

    // S-Index
    sindex: { obtido:'', predito:'', obs:'' },

    // Preensão palmar
    grip: { obtido:'', predito:'', mao:'Dominante' },

    // Dinamometria bilateral (Meldrum 2007)
    dinamo: {
      quadD:'', quadE:'', quadPred:'',
      bicD:'',  bicE:'',  bicPred:'',
    },

    // TSL
    sts5: { tempo:'', predito:'' },
    sts1: { reps:'',  predito:'' },

    // SPPB
    sppb: {
      velMarcha4m:'', pontoVel:'',
      peJuntos:'', pontoPeJuntos:'',
      umPeFrente:'', pontoUmPe:'',
      haluxCalcanhar:'', pontoHalux:'',
      tsl5ponto:'',
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
