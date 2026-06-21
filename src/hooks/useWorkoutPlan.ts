import { useState, useEffect } from 'react'
import { getPlansForUser, getPlanExercises } from '../lib/queries/plans'
import { getSessionForDate } from '../lib/queries/sessions'
import { JS_DAY_TO_KEY, type DayKey, type WorkoutPlan, type PlanExercise } from '../types'

export function todayKey(): DayKey {
  return JS_DAY_TO_KEY[new Date().getDay()]
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useWorkoutPlan(userId: number) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey())
  const [overridePlanId, setOverridePlanId] = useState<number | null>(null)
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlansForUser(userId).then(setPlans)
  }, [userId])

  const activePlan = overridePlanId
    ? plans.find(p => p.id === overridePlanId)
    : plans.find(p => p.suggestedDay === selectedDay)

  useEffect(() => {
    if (!activePlan) { setExercises([]); setLoading(false); return }
    setLoading(true)
    getPlanExercises(activePlan.id).then(ex => { setExercises(ex); setLoading(false) })
  }, [activePlan?.id])

  useEffect(() => {
    if (selectedDay !== todayKey()) { setOverridePlanId(null); return }
    getSessionForDate(userId, todayStr()).then(s => {
      if (s) setOverridePlanId(s.planId)
    })
  }, [userId, selectedDay])

  return {
    plans, selectedDay, setSelectedDay,
    activePlan, overridePlanId, setOverridePlanId,
    exercises, loading,
  }
}
