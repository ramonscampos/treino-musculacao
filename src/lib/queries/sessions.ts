import { db } from '../db'
import type { WorkoutSession } from '../../types'

export async function getSessionForDate(userId: number, date: string): Promise<WorkoutSession | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM workout_sessions WHERE user_id = ? AND performed_on = ?',
    args: [userId, date],
  })
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id as number,
    userId: r.user_id as number,
    planId: r.plan_id as number,
    performedOn: r.performed_on as string,
  }
}

export async function upsertSession(userId: number, planId: number, date: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO workout_sessions (user_id, plan_id, performed_on) VALUES (?, ?, ?)
          ON CONFLICT (user_id, performed_on) DO UPDATE SET plan_id = excluded.plan_id`,
    args: [userId, planId, date],
  })
}

export async function getSessionsInRange(userId: number, from: string, to: string): Promise<WorkoutSession[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM workout_sessions WHERE user_id = ? AND performed_on BETWEEN ? AND ? ORDER BY performed_on',
    args: [userId, from, to],
  })
  return rows.map(r => ({
    id: r.id as number,
    userId: r.user_id as number,
    planId: r.plan_id as number,
    performedOn: r.performed_on as string,
  }))
}
