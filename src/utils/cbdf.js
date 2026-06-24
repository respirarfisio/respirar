// src/utils/cbdf.js
// Tabela de referência de códigos da Classificação Brasileira de Diagnósticos
// Fisioterapêuticos (CBDF — COFFITO, Resolução nº 555/2022 e atualização CBDF-1).
//
// IMPORTANTE: não existe API pública do COFFITO para consulta automática de códigos.
// Esta é uma lista de referência com os códigos mais comuns em avaliação
// cardiorrespiratória e funcional, para seleção manual pelo profissional.
// Sempre confirme o código mais adequado ao caso em https://cbdf.coffito.gov.br/

export const CBDF_LINK = 'https://cbdf.coffito.gov.br/'

export const CBDF_CODIGOS = [
  // ── Capítulo R — Deficiências cinético-funcionais respiratórias ────────
  { codigo: 'CBDF R01.00', descricao: 'Deficiência cinético-funcional respiratória — função ventilatória, sem alteração' },
  { codigo: 'CBDF R01.01', descricao: 'Deficiência cinético-funcional respiratória ventilatória restritiva' },
  { codigo: 'CBDF R02.01', descricao: 'Deficiência cinético-funcional respiratória ventilatória obstrutiva' },
  { codigo: 'CBDF D04.01', descricao: 'Deficiência cinético-funcional respiratória obstrutiva de vias aéreas médio-distais' },
  { codigo: 'CBDF R03.01', descricao: 'Deficiência cinético-funcional da força muscular respiratória (inspiratória/expiratória)' },
  { codigo: 'CBDF R04.01', descricao: 'Deficiência cinético-funcional da capacidade de troca gasosa / dessaturação ao esforço' },

  // ── Capítulo C — Deficiências cinético-funcionais cardiovasculares ─────
  { codigo: 'CBDF C01.01', descricao: 'Deficiência cinético-funcional cardiovascular — resposta cronotrópica/pressórica ao esforço' },
  { codigo: 'CBDF C02.01', descricao: 'Deficiência cinético-funcional da capacidade aeróbia / intolerância ao exercício' },

  // ── Capítulo M — Mobilidade ──────────────────────────────────────────────
  { codigo: 'CBDF M01.01', descricao: 'Mobilidade para transferências com deficiência cinético-funcional' },
  { codigo: 'CBDF M04.00', descricao: 'Locomoção básica sem deficiência cinético-funcional' },
  { codigo: 'CBDF M04.01', descricao: 'Deficiência cinético-funcional da locomoção / marcha (velocidade, distância reduzida)' },
  { codigo: 'CBDF M05.01', descricao: 'Deficiência cinético-funcional do equilíbrio estático e/ou dinâmico' },

  // ── Capítulo Me — Musculoesquelético ────────────────────────────────────
  { codigo: 'CBDF Me01.01', descricao: 'Deficiência cinético-funcional da força muscular periférica (membros superiores/inferiores)' },
  { codigo: 'CBDF Me02.01', descricao: 'Deficiência cinético-funcional da resistência muscular periférica' },

  // ── Capítulo P — Participação ───────────────────────────────────────────
  { codigo: 'CBDF P01.01', descricao: 'Participação em atividades de trabalho com deficiência cinético-funcional' },
  { codigo: 'CBDF P02.01', descricao: 'Participação em atividades de vida diária/autocuidado com deficiência cinético-funcional' },
]
