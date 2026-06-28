// src/utils/cbdf.js
// Motor de composição da Classificação Brasileira de Diagnósticos
// Fisioterapêuticos (CBDF — COFFITO, Anexo I).
//
// Em vez de uma lista de frases prontas para marcar manualmente, este módulo
// MONTA cada código dígito a dígito a partir dos dados que o fisioterapeuta já
// preenche na avaliação (% do previsto de PImáx/PEmáx, CVF, TC6, dinamometria,
// BORG, %FCmáx etc.), seguindo a estrutura oficial do CBDF:
//
//   CBDF [Letra][NN].[NN].[d].[d].[d].[d]
//        sistema    status   Bloco B (dados semiológicos, 0-4, 8 ou 9)
//
// O resultado é sempre uma SUGESTÃO: cada subcódigo vem marcado com a origem
// do dado (de qual teste foi inferido) e pode ser sobrescrito manualmente
// pelo fisioterapeuta antes de salvar — a responsabilidade pelo diagnóstico
// final é sempre do profissional.
//
// Não existe API pública do COFFITO para validação automática de códigos.
// Consulte sempre a tabela oficial em https://cbdf.coffito.gov.br/ em caso de dúvida.

export const CBDF_LINK = 'https://cbdf.coffito.gov.br/'

function num(v) {
  if (v === '' || v == null) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

// ── Escalas auxiliares de conversão % previsto -> dígito 0-4 (CBDF) ───────
// Convenção oficial usada em vários subcódigos do Bloco B:
//   0 = sem alteração (>=96% do previsto)   1 = leve (76-95%)
//   2 = moderada (51-75%)                    3 = grave (5-50%)
//   4 = completa (0-4%)
function digitoPorPercentual(pct) {
  if (pct == null) return null
  if (pct >= 96) return 0
  if (pct >= 76) return 1
  if (pct >= 51) return 2
  if (pct >= 5) return 3
  return 4
}

// BORG (0-10) -> dígito de desconforto/fadiga (0-4)
function digitoPorBorg(borg) {
  if (borg == null) return null
  if (borg <= 1) return 0
  if (borg <= 3) return 1
  if (borg <= 5) return 2
  if (borg <= 7) return 3
  return 4
}

const RotuloDigito = ['Sem alteração', 'Leve', 'Moderada', 'Grave', 'Completa']

// ── Estrutura de um subcódigo (1 dígito do Bloco B) ───────────────────────
// digito: 0-4 (achado), 8 (não especificada), 9 (não aplicável) ou null (sem dado)
// origem: de onde veio o valor, mostrado ao fisioterapeuta para transparência
function sub(label, digito, origem, rotulo) {
  return {
    label,
    digito,
    origem,
    rotulo: rotulo ?? (digito != null && digito <= 4 ? RotuloDigito[digito] : null),
  }
}

// ════════════════════════════════════════════════════════════════════════
// D03 — Deficiência Cinético-Funcional Musculoesquelética
// Bloco A: status (00 sem lesão / 01 lesão aguda / 02 lesão crônica) - manual
// Bloco B: 3º dor · 4º mobilidade articular · 5º funções musculares (auto)
// Bloco C: 6º segmento corporal - manual
// ════════════════════════════════════════════════════════════════════════
function montarD03(ev, calc, manual) {
  const status = manual?.d03Status ?? '00'
  const dorDigito = manual?.d03Dor ?? null // sem fonte automática (não há campo de dor hoje)
  const mobArtDigito = manual?.d03MobArt ?? null // idem

  // Funções musculares: pior resultado entre dinamometria (quad/bíceps) e preensão palmar
  const pcts = [calc.quadPct, calc.bicPct, calc.gripPct].filter((p) => p != null)
  const piorPct = pcts.length ? Math.min(...pcts) : null
  const funcMuscDigito = digitoPorPercentual(piorPct)

  const segmento = manual?.d03Segmento ?? '9'

  const subs = [
    sub('Dor', dorDigito, 'Informado manualmente'),
    sub('Mobilidade articular', mobArtDigito, 'Informado manualmente'),
    sub(
      'Funções musculares',
      funcMuscDigito,
      piorPct != null
        ? `${piorPct}% do previsto (pior valor entre dinamometria/preensão)`
        : 'Sem dado de força muscular periférica',
    ),
  ]

  return {
    sistema: 'D03',
    nome: 'Deficiência Cinético-Funcional Musculoesquelética',
    status,
    statusLabel: {
      '00': 'Sem lesão de estrutura',
      '01': 'Com lesão estrutural aguda',
      '02': 'Com lesão estrutural crônica',
    }[status],
    subs,
    temBlocoC: true,
    segmento,
    completo: subs.every((s) => s.digito != null),
  }
}

// ════════════════════════════════════════════════════════════════════════
// D04 — Deficiência Cinético-Funcional Respiratória
// Bloco A: status 00-05, inferido da classificação espirométrica selecionada
// Bloco B: 3º oxigenação (SpO2) · 4º desconforto (BORG) · 5º volume pulmonar
//          (% CVF) · 6º força muscular respiratória (% PImáx/PEmáx)
// ════════════════════════════════════════════════════════════════════════
const STATUS_D04_POR_CLASSIFICACAO = {
  'Espirometria normal': '05',
  'Distúrbio ventilatório obstrutivo leve': '00',
  'Distúrbio ventilatório obstrutivo moderado': '00',
  'Distúrbio ventilatório obstrutivo grave': '00',
  'Distúrbio ventilatório restritivo': '02',
  'Distúrbio ventilatório misto': '00',
}

function montarD04(ev, calc, manual) {
  const classificacaoEspiro = ev.espiro?.classificacao
  const status = manual?.d04Status ?? STATUS_D04_POR_CLASSIFICACAO[classificacaoEspiro] ?? '05'

  // Oxigenação: pior SpO2 observado entre TC6 e degrau (subcódigo é binário 0/4)
  const spo2s = [num(ev.tc6?.spo2Fim), num(ev.degrau?.spo2Fim)].filter((v) => v != null)
  const piorSpo2 = spo2s.length ? Math.min(...spo2s) : null
  const oxigenacaoDigito = piorSpo2 == null ? null : piorSpo2 >= 95 ? 0 : 4

  // Desconforto respiratório: pior BORG final entre os testes de esforço
  const borgs = [num(ev.tc6?.borgFim), num(ev.degrau?.borgFim)].filter((v) => v != null)
  const piorBorg = borgs.length ? Math.max(...borgs) : null
  const desconfortoDigito = digitoPorBorg(piorBorg)

  // Volume de expansão pulmonar: % previsto de CVF
  const volumeDigito = digitoPorPercentual(calc.cvfPct)

  // Força muscular respiratória: pior entre PImáx e PEmáx (% previsto)
  const forcas = [calc.pimPct, calc.pemPct].filter((p) => p != null)
  const piorForca = forcas.length ? Math.min(...forcas) : null
  const forcaDigito = digitoPorPercentual(piorForca)

  const subs = [
    sub(
      'Oxigenação',
      oxigenacaoDigito,
      piorSpo2 != null ? `SpO₂ mínima registrada: ${piorSpo2}%` : 'Sem SpO₂ registrada nos testes',
      oxigenacaoDigito === 0 ? 'Oxigenação normal' : oxigenacaoDigito === 4 ? 'Baixa oxigenação' : null,
    ),
    sub(
      'Desconforto respiratório',
      desconfortoDigito,
      piorBorg != null ? `BORG final mais alto registrado: ${piorBorg}` : 'Sem BORG registrado nos testes',
    ),
    sub(
      'Volume de expansão pulmonar',
      volumeDigito,
      calc.cvfPct != null ? `CVF: ${calc.cvfPct}% do previsto` : 'Sem CVF registrada (espirometria)',
    ),
    sub(
      'Força muscular respiratória',
      forcaDigito,
      piorForca != null
        ? `Menor valor entre PImáx/PEmáx: ${piorForca}% do previsto`
        : 'Sem PImáx/PEmáx registrados',
    ),
  ]

  return {
    sistema: 'D04',
    nome: 'Deficiência Cinético-Funcional Respiratória',
    status,
    statusLabel: {
      '00': 'Obstrutiva de vias aéreas (proximais ou médio-distais)',
      '01': 'Obstrutiva de vias aéreas inferiores médio-distais (VAIMD)',
      '02': 'Restritiva',
      '03': 'De baixa elastância',
      '04': 'Neuromuscular',
      '05': 'Não especificada / sem distúrbio ventilatório',
    }[status],
    subs,
    temBlocoC: false,
    completo: subs.every((s) => s.digito != null),
  }
}

// ════════════════════════════════════════════════════════════════════════
// D05 — Deficiência Cinético-Funcional Cardiovascular
// Bloco A: status 00 (sem alteração estrutural) / 01 (com alteração) - manual
// Bloco B: 3º capacidade aeróbica (TC6) · 4º função dos vasos (manual) ·
//          5º fatigabilidade (BORG) · 6º frequência cardíaca (%FCmáx Tanaka)
// ════════════════════════════════════════════════════════════════════════
function montarD05(ev, calc, paciente, manual) {
  const status = manual?.d05Status ?? '00'

  // Capacidade aeróbica: % do previsto da distância do TC6
  const caDigito = digitoPorPercentual(calc.tc6Pct)

  const vasosDigito = manual?.d05Vasos ?? null // sem fonte automática

  // Fatigabilidade: BORG final do TC6 (teste mais específico de capacidade aeróbia)
  const borgTC6 = num(ev.tc6?.borgFim)
  const fatigaDigito = digitoPorBorg(borgTC6)

  // Frequência cardíaca: %FCmáx atingida (Tanaka) no TC6
  const fcMaxTeorica = paciente?.idade ? 208 - 0.7 * paciente.idade : null
  const fcMaxObtida = num(ev.tc6?.fcMax)
  const pctFcMax = fcMaxTeorica && fcMaxObtida ? Math.round((fcMaxObtida / fcMaxTeorica) * 100) : null
  const fcDigito = pctFcMax == null ? null : pctFcMax >= 85 && pctFcMax <= 100 ? 0 : 4

  const subs = [
    sub(
      'Capacidade aeróbica',
      caDigito,
      calc.tc6Pct != null ? `TC6: ${calc.tc6Pct}% da distância prevista` : 'Sem distância do TC6 registrada',
    ),
    sub('Função dos vasos', vasosDigito, 'Informado manualmente'),
    sub(
      'Fatigabilidade',
      fatigaDigito,
      borgTC6 != null ? `BORG final do TC6: ${borgTC6}` : 'Sem BORG do TC6 registrado',
    ),
    sub(
      'Frequência cardíaca',
      fcDigito,
      pctFcMax != null ? `${pctFcMax}% da FC máx. teórica (Tanaka) atingida no TC6` : 'Sem FC máx. do TC6 registrada',
      fcDigito === 0 ? 'Sem alteração da frequência cardíaca' : fcDigito === 4 ? 'Com alteração da frequência cardíaca' : null,
    ),
  ]

  return {
    sistema: 'D05',
    nome: 'Deficiência Cinético-Funcional Cardiovascular',
    status,
    statusLabel: { '00': 'Sem alteração de estrutura', '01': 'Com alteração de estrutura' }[status],
    subs,
    temBlocoC: false,
    completo: subs.every((s) => s.digito != null),
  }
}

// ════════════════════════════════════════════════════════════════════════
// M04 — Mobilidade para Locomoção/Deslocamento Básico
// Bloco A: status 00 (sem deficiência) / 01 (com deficiência) - auto pelo TC6/SPPB
// Bloco B: 3º deambulação curtas distâncias · 4º deambulação longas distâncias
//          · 5º velocidade de marcha · 6º subir/descer escadas (manual)
// ════════════════════════════════════════════════════════════════════════
function montarM04(ev, calc, manual) {
  // Velocidade de marcha: usa a pontuação SPPB (0-4) já registrada, se houver;
  // senão infere do % do previsto do TC6.
  const sppbVel = num(ev.sppb?.pontoVel)
  const velocidadeDigito =
    sppbVel != null ? 4 - Math.min(4, Math.max(0, sppbVel)) : digitoPorPercentual(calc.tc6Pct)

  // Deambulação curtas distâncias: % do previsto do TC6 (escala 0-4 completa)
  const deambCurtaDigito = digitoPorPercentual(calc.tc6Pct)
  // Deambulação longas distâncias: mesmo teste, mas subcódigo é binário (0/4) na tabela oficial
  const deambLongaDigito = calc.tc6Pct == null ? null : calc.tc6Pct >= 76 ? 0 : 4

  const status = manual?.m04Status ?? (calc.tc6Pct == null ? null : calc.tc6Pct >= 76 ? '00' : '01')

  const escadasDigito = manual?.m04Escadas ?? null // sem fonte automática

  const subs = [
    sub(
      'Deambulação curtas distâncias',
      deambCurtaDigito,
      calc.tc6Pct != null ? `TC6: ${calc.tc6Pct}% da distância prevista` : 'Sem distância do TC6 registrada',
    ),
    sub(
      'Deambulação longas distâncias',
      deambLongaDigito,
      calc.tc6Pct != null ? `TC6: ${calc.tc6Pct}% da distância prevista` : 'Sem distância do TC6 registrada',
      deambLongaDigito === 0 ? 'Sem limitação' : deambLongaDigito === 4 ? 'Com limitação' : null,
    ),
    sub(
      'Velocidade de marcha',
      velocidadeDigito,
      sppbVel != null
        ? `Pontuação SPPB de velocidade de marcha: ${sppbVel}/4`
        : calc.tc6Pct != null
          ? `Estimado pelo % do previsto do TC6 (${calc.tc6Pct}%)`
          : 'Sem dado de velocidade de marcha',
    ),
    sub('Subir/descer escadas e/ou rampas', escadasDigito, 'Informado manualmente'),
  ]

  return {
    sistema: 'M04',
    nome: 'Mobilidade para Locomoção/Deslocamento Básico',
    status,
    statusLabel: { '00': 'Sem deficiência cinético-funcional', '01': 'Com deficiência cinético-funcional' }[status],
    subs,
    temBlocoC: false,
    completo: subs.every((s) => s.digito != null),
  }
}

// ── Monta o código final no formato textual CBDF ───────────────────────────
function formatarCodigo(bloco) {
  const digitosB = bloco.subs.map((s) => (s.digito == null ? '_' : s.digito))
  const partes = [bloco.sistema, bloco.status ?? '__', ...digitosB]
  if (bloco.temBlocoC) partes.push(bloco.segmento ?? '9')
  return `CBDF ${partes[0]}.${partes[1]}.${partes.slice(2).join('.')}`
}

// ── Função principal: monta todos os blocos suportados ──────────────────────
// manual: objeto opcional com overrides do fisioterapeuta (ver ev.cbdf em
// utils/avaliacao.js), por bloco — ex: { d03Status, d03Dor, d04Status, ... }
export function montarCBDF(ev, calc, paciente, manual = {}) {
  const blocos = {
    d03: montarD03(ev, calc, manual),
    d04: montarD04(ev, calc, manual),
    d05: montarD05(ev, calc, paciente, manual),
    m04: montarM04(ev, calc, manual),
  }
  for (const key of Object.keys(blocos)) {
    blocos[key].codigo = formatarCodigo(blocos[key])
  }
  return blocos
}

// ── Opções para os campos manuais (selects na UI) ───────────────────────────
export const OPCOES_D03_STATUS = [
  { value: '00', label: 'Sem lesão de estrutura' },
  { value: '01', label: 'Com lesão estrutural aguda' },
  { value: '02', label: 'Com lesão estrutural crônica' },
]
export const OPCOES_D05_STATUS = [
  { value: '00', label: 'Sem alteração de estrutura' },
  { value: '01', label: 'Com alteração de estrutura (ex.: cardiopatia diagnosticada)' },
]
export const OPCOES_M04_STATUS = [
  { value: '00', label: 'Sem deficiência cinético-funcional' },
  { value: '01', label: 'Com deficiência cinético-funcional' },
]
export const OPCOES_DIGITO_0A4 = [
  { value: 0, label: '0 — Sem alteração' },
  { value: 1, label: '1 — Leve' },
  { value: 2, label: '2 — Moderada' },
  { value: 3, label: '3 — Grave' },
  { value: 4, label: '4 — Completa' },
]
export const OPCOES_DIGITO_BIN = [
  { value: 0, label: '0 — Sem alteração' },
  { value: 4, label: '4 — Com alteração' },
]
export const OPCOES_SEGMENTO_D03 = [
  { value: '0', label: 'Cabeça (ATM, crânio, face)' },
  { value: '1', label: 'Coluna' },
  { value: '2', label: 'Coluna e membros' },
  { value: '3', label: 'Um segmento ou parte do corpo' },
  { value: '4', label: 'Mais de uma parte do corpo' },
  { value: '9', label: 'Não aplicável' },
]
