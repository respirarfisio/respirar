// src/utils/financeiro.js — utilitários financeiros

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Convênio']

export const CATEGORIAS_DESPESA = [
  'Aluguel / Sala', 'Material clínico', 'Equipamentos',
  'Deslocamento', 'Marketing', 'Impostos / Contador',
  'Software / Assinaturas', 'Cursos / Capacitação', 'Outros',
]

export const STATUS_PACOTE = {
  ativo:     { label: 'Ativo',     tone: 'good' },
  concluido: { label: 'Concluído', tone: 'neutral' },
  cancelado: { label: 'Cancelado', tone: 'bad' },
}

export function fmtBRL(valor) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtMes(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[+m - 1]}/${y}`
}

// Sessões realizadas de um paciente (vem da coleção de sessões SOAP)
export function contarSessoes(sessoes, pacoteInicio) {
  if (!pacoteInicio) return sessoes.length
  return sessoes.filter(s => s.data >= pacoteInicio).length
}

// Saldo de um pacote
export function calcSaldo(pacote, totalPago) {
  const total = (pacote.valorSessao ?? 0) * (pacote.totalSessoes ?? 0)
  return total - (totalPago ?? 0)
}

// Gera payload PIX estático (formato EMV/QR Code texto)
// Para QR dinâmico real precisaria de API bancária
export function gerarPixCopia(chave, nome, cidade, valor, txid = 'RESPIRAR') {
  const v = (id, val) => {
    const s = String(val)
    return `${id}${String(s.length).padStart(2,'0')}${s}`
  }
  const merchantAccountInfo = v('00', 'BR.GOV.BCB.PIX') + v('01', chave)
  const payload =
    v('00', '01') +
    v('26', merchantAccountInfo) +
    v('52', '0000') +
    v('53', '986') +
    (valor ? v('54', Number(valor).toFixed(2)) : '') +
    v('58', 'BR') +
    v('59', nome.slice(0, 25)) +
    v('60', cidade.slice(0, 15)) +
    v('62', v('05', txid.slice(0, 25))) +
    '6304'

  // CRC16-CCITT
  let crc = 0xFFFF
  for (const c of payload) {
    crc ^= c.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
  }
  return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
}

// Meses dos últimos N meses como array de ISO (YYYY-MM)
export function ultimosMeses(n = 6) {
  const hoje = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1)
    return d.toISOString().slice(0, 7)
  })
}
