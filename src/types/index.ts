export interface User {
  id: number
  name: string
}

export interface Exercise {
  id: number
  name: string
  description?: string
}

export interface WorkoutPlan {
  id: number
  userId: number
  name: string
  suggestedDay: DayKey
  title: string
}

export interface PlanExercise {
  id: number
  planId: number
  exerciseId: number
  exerciseName: string
  sets?: number
  repsMin?: number
  repsMax?: number
  restSeconds?: number
  muscleFocus?: string
  executionCues: string[]
  note?: string
  sortOrder: number
  isSupersetWith?: number
  extra?: string
}

export interface WorkoutSession {
  id: number
  userId: number
  planId: number
  performedOn: string
}

export interface LoadLog {
  id: number
  userId: number
  exerciseId: number
  loggedAt: string
  sets: LoadLogSet[]
}

export interface LoadLogSet {
  id: number
  logId: number
  setNumber: number
  weight: number
}

export type DayKey = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'

export const DAY_LABELS: Record<DayKey, string> = {
  SEG: 'Seg', TER: 'Ter', QUA: 'Qua',
  QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom',
}

export const DAY_ORDER: DayKey[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

export const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB',
}

export interface UserTheme {
  accentColor: string
  accentGlow: string
  accentSoft: string
  accentMute: string
  bgColor: string
  success: string
  successBg: string
}

export const USER_THEMES: Record<string, UserTheme> = {
  Ramon: {
    accentColor: '#d1ff4e',
    accentGlow: 'rgba(209,255,78,0.3)',
    accentSoft: 'rgba(209,255,78,0.06)',
    accentMute: 'rgba(209,255,78,0.2)',
    bgColor: '#0a0a0c',
    success: '#4eff88',
    successBg: 'rgba(78,255,136,0.1)',
  },
  Andressa: {
    accentColor: '#a78bfa',
    accentGlow: 'rgba(167,139,250,0.3)',
    accentSoft: 'rgba(167,139,250,0.06)',
    accentMute: 'rgba(167,139,250,0.2)',
    bgColor: '#0f0a0c',
    success: '#34d399',
    successBg: 'rgba(52,211,153,0.1)',
  },
}
