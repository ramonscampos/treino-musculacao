export function parseSets(s: string): { sets?: number; repsMin?: number; repsMax?: number } {
  const m = s.match(/^(\d+)x(\d+)[–\-](\d+)/)
  if (m) return { sets: +m[1], repsMin: +m[2], repsMax: +m[3] }
  const m2 = s.match(/^(\d+)\s*séries?/i)
  if (m2) return { sets: +m2[1] }
  const m3 = s.match(/^(\d+)x(\d+)/)
  if (m3) return { sets: +m3[1], repsMin: +m3[2], repsMax: +m3[2] }
  return {}
}

export function parseRest(s?: string): number | undefined {
  if (!s) return undefined
  const m = s.match(/(\d+)\s*min/i)
  if (m) return +m[1] * 60
  const m2 = s.match(/(\d+)\s*s/i)
  if (m2) return +m2[1]
  return undefined
}

export interface RawExercise {
  name: string
  sets: string
  rest?: string
  note?: string
  executionCues?: string[]
  muscleFocus?: string
  description?: string
}

export interface RawDayData {
  title: string
  exercises: RawExercise[]
  rest?: boolean
  extra?: string
}

export const RAMON_DATA: Record<string, RawDayData> = {
  SEG: {
    title: 'SEGUNDA — LEGS (Quadríceps Prioridade)',
    exercises: [
      {
        name: 'Agachamento Livre',
        description: 'Barra livre',
        executionCues: ['Profundidade máxima sem perder lombar'],
        muscleFocus: 'Quadríceps',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Leg Press 45°',
        executionCues: ['Pés baixos e relativamente fechados', 'Foco em quadríceps'],
        muscleFocus: 'Quadríceps',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Agachamento Búlgaro',
        description: 'Halteres',
        executionCues: ['Passada curta', 'Tronco levemente ereto'],
        muscleFocus: 'Quadríceps',
        sets: '3x10–12 cada perna', rest: '2min',
      },
      {
        name: 'Cadeira Extensora',
        executionCues: ['Segurar 1 segundo no topo', 'Controlar descida'],
        muscleFocus: 'Quadríceps',
        sets: '3x12–15', rest: '90s',
        note: 'Última série drop-set opcional',
      },
    ],
  },
  TER: {
    title: 'TERÇA — PUSH (Peito Superior + Tríceps)',
    exercises: [
      {
        name: 'Supino Inclinado',
        description: 'Barra (preferencial) ou Máquina convergente inclinada',
        executionCues: ['Banco entre 30° e 40°'],
        muscleFocus: 'Peito superior',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Supino Reto',
        description: 'Máquina convergente (preferencial), Barra ou Halteres',
        muscleFocus: 'Peito',
        sets: '3x8–10', rest: '2min',
      },
      {
        name: 'Crucifixo no Cabo (Low-to-High)',
        description: 'Polias baixas',
        executionCues: ['Movimento subindo em direção ao rosto', 'Foco total em peito superior'],
        muscleFocus: 'Peito superior',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Francês na Corda',
        description: 'Polia alta',
        executionCues: ['Braços acima da cabeça', 'Alongar bem o tríceps'],
        muscleFocus: 'Tríceps',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Tríceps Corda',
        description: 'Polia alta',
        executionCues: ['Abrindo a corda no final'],
        muscleFocus: 'Tríceps',
        sets: '3x12–15', rest: '90s',
      },
    ],
  },
  QUA: {
    title: 'QUARTA — PULL (Costas + Posterior)',
    exercises: [
      {
        name: 'Puxada Frontal Aberta',
        description: 'Barra longa, pegada pronada',
        executionCues: ['Pegada pronada', 'Trazer para parte superior do peito'],
        muscleFocus: 'Costas',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Remada Máquina Apoiada',
        description: 'Hammer, Articulada ou Iso-lateral',
        executionCues: ['Apoio no peito obrigatório'],
        muscleFocus: 'Costas',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Remada Unilateral',
        description: 'Halter apoiado no banco ou Máquina unilateral',
        muscleFocus: 'Costas',
        sets: '3x10–12', rest: '90s',
      },
      {
        name: 'Crucifixo Inverso',
        description: 'Máquina reverse fly ou Peck deck invertido',
        muscleFocus: 'Posterior de ombro',
        sets: '4x12–15', rest: '90s',
      },
      {
        name: 'Rosca Direta Barra W',
        executionCues: ['Pegada confortável'],
        muscleFocus: 'Bíceps',
        sets: '4x8–10', rest: '90s',
      },
      {
        name: 'Rosca Martelo',
        description: 'Halteres',
        executionCues: ['Alternada ou simultânea'],
        muscleFocus: 'Bíceps',
        sets: '3x10–12', rest: '90s',
      },
    ],
  },
  QUI: {
    title: 'QUINTA — LEGS (Posterior Prioridade)',
    exercises: [
      {
        name: 'Hack Squat',
        executionCues: ['Posição confortável', 'Sem sacrificar joelho'],
        muscleFocus: 'Quadríceps',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Cadeira Flexora',
        executionCues: ['Controle total'],
        muscleFocus: 'Posterior',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Stiff',
        description: 'Halteres ou Barra',
        executionCues: ['Alongamento máximo da posterior', 'Coluna neutra'],
        muscleFocus: 'Posterior',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Mesa Flexora',
        executionCues: ['Movimento completo'],
        muscleFocus: 'Posterior',
        sets: '3x10–12', rest: '90s',
      },
      {
        name: 'Adução Máquina',
        executionCues: ['Sem exagerar carga'],
        muscleFocus: 'Adutor',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Panturrilha Em Pé',
        description: 'Máquina específica',
        muscleFocus: 'Panturrilha',
        sets: '3x12–15', rest: '60s',
      },
    ],
  },
  SEX: {
    title: 'SEXTA — OMBRO + TRÍCEPS',
    exercises: [
      {
        name: 'Desenvolvimento',
        description: 'Máquina (preferencial) ou Halteres',
        muscleFocus: 'Ombro',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Elevação Lateral',
        description: 'Halteres ou Máquina',
        executionCues: ['Movimento controlado', 'Braço semi-flexionado'],
        muscleFocus: 'Ombro lateral',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Elevação Lateral na Polia',
        executionCues: ['Polia baixa', 'Um braço por vez'],
        muscleFocus: 'Ombro lateral',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Face Pull',
        executionCues: ['Polia alta', 'Corda', 'Cotovelos altos'],
        muscleFocus: 'Posterior de ombro',
        sets: '4x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Francês na Corda',
        executionCues: ['Braços acima da cabeça', 'Alongar bem o tríceps'],
        muscleFocus: 'Tríceps',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Tríceps Barra V',
        executionCues: ['Polia alta', 'Movimento pesado'],
        muscleFocus: 'Tríceps',
        sets: '3x10–12', rest: '90s',
      },
    ],
  },
  SAB: {
    title: 'SÁBADO — UPPER (Manutenção)',
    exercises: [
      {
        name: 'Supino Inclinado',
        description: 'Barra ou máquina',
        muscleFocus: 'Peito superior',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Remada com Banco Inclinado',
        description: 'Halteres',
        executionCues: ['Banco a 30°–45°', 'Peito apoiado'],
        muscleFocus: 'Costas',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Puxada Neutra',
        executionCues: ['Triângulo ou pegadores neutros'],
        muscleFocus: 'Costas',
        sets: '3x8–10', rest: '2min',
      },
      {
        name: 'Crucifixo Inclinado',
        description: 'Halteres',
        executionCues: ['Banco 30°'],
        muscleFocus: 'Peito superior',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Crucifixo Inverso',
        description: 'Máquina',
        muscleFocus: 'Posterior de ombro',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Corda',
        executionCues: ['Polia alta'],
        muscleFocus: 'Tríceps',
        sets: '3x12–15', rest: '90s',
      },
    ],
  },
  DOM: { title: 'DOMINGO — DESCANSO', exercises: [], rest: true },
}

export const ANDRESSA_DATA: Record<string, RawDayData> = {
  SEG: {
    title: 'SEGUNDA — OMBRO',
    exercises: [
      { name: 'Desenvolvimento com halteres', sets: '4x6–8', rest: '3min' },
      { name: 'Elevação lateral com halteres', sets: '4x10–12', rest: '90s' },
      { name: 'Elevação lateral na polia baixa', sets: '3x12–15', rest: '90s' },
      { name: 'Remada alta na polia', sets: '4x8–10', rest: '2min' },
      { name: 'Face pull', sets: '3x12–15', rest: '90s' },
    ],
  },
  TER: {
    title: 'TERÇA — GLÚTEO & POSTERIOR',
    exercises: [
      { name: 'Elevação Pélvica', sets: '4 séries', rest: '90s' },
      { name: 'Búlgaro', sets: '4x8–10', rest: '2min' },
      { name: 'Terra Sumô', sets: '4 séries', rest: '90s' },
      { name: 'Cadeira Abdutora (Tronco Inclinado)', sets: '4x12–15', rest: '60s' },
      { name: 'Abdução no Cabo', sets: '3x10+10', rest: '60s' },
    ],
  },
  QUA: { title: 'QUARTA — CARDIO', exercises: [], rest: true, extra: 'Bikezinha, esteira ou a escada do capiroto' },
  QUI: {
    title: 'QUINTA — POSTERIOR & GLÚTEO',
    exercises: [
      { name: 'Cadeira Flexora', sets: '4 séries', rest: '60s' },
      { name: 'Stiff', sets: '4 séries', rest: '90s' },
      { name: 'Mesa Flexora', sets: '3x10+10', rest: '60s' },
      { name: 'RDL', sets: '4x8–10', rest: '90s' },
      { name: 'Leg 45 Abduzido', sets: '3x10–12', rest: '2min' },
      { name: 'Cadeira Abdutora (Tronco Reto)', sets: '4x12–15', rest: '60s' },
    ],
  },
  SEX: { title: 'SEXTA — A DEFINIR', exercises: [], extra: 'Só falta esse, mô' },
  SAB: {
    title: 'SÁBADO — LEGS (Quad + Vasto Medial)',
    exercises: [
      { name: 'Agachamento livre', sets: '4x8–10', rest: '2min' },
      { name: 'Leg press pé baixo e fechado', sets: '4x10–12', rest: '2min' },
      { name: 'Afundo', sets: '3x8–10 cada perna', rest: '2min' },
      { name: 'Cadeira extensora', sets: '4x10–12', rest: '90s', note: 'última série: drop set' },
      { name: 'Panturrilha sentado', sets: '4x12–15', rest: '60s' },
    ],
  },
  DOM: { title: 'DOMINGO — DESCANSO', exercises: [], rest: true, extra: 'Descansa, mozão' },
}
