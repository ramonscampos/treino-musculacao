import { db } from '../db'
import type { LoadLog } from '../../types'

export async function getLoadForDate(userId: number, exerciseId: number, date: string): Promise<LoadLog | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? AND logged_at = ?',
    args: [userId, exerciseId, date],
  })
  if (!rows[0]) return null
  return fetchLoadWithSets(rows[0])
}

export async function getLastLoad(userId: number, exerciseId: number): Promise<LoadLog | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? ORDER BY logged_at DESC LIMIT 1',
    args: [userId, exerciseId],
  })
  if (!rows[0]) return null
  return fetchLoadWithSets(rows[0])
}

async function fetchLoadWithSets(logRow: Record<string, unknown>): Promise<LoadLog> {
  const { rows: setRows } = await db.execute({
    sql: 'SELECT * FROM load_log_sets WHERE log_id = ? ORDER BY set_number',
    args: [logRow.id as number],
  })
  return {
    id: logRow.id as number,
    userId: logRow.user_id as number,
    exerciseId: logRow.exercise_id as number,
    loggedAt: logRow.logged_at as string,
    sets: setRows.map(s => ({
      id: s.id as number,
      logId: s.log_id as number,
      setNumber: s.set_number as number,
      weight: s.weight as number,
    })),
  }
}

export async function upsertLoad(userId: number, exerciseId: number, date: string, weights: number[]): Promise<void> {
  await db.execute({
    sql: `INSERT INTO load_logs (user_id, exercise_id, logged_at) VALUES (?, ?, ?)
          ON CONFLICT (user_id, exercise_id, logged_at) DO NOTHING`,
    args: [userId, exerciseId, date],
  })
  const { rows } = await db.execute({
    sql: 'SELECT id FROM load_logs WHERE user_id = ? AND exercise_id = ? AND logged_at = ?',
    args: [userId, exerciseId, date],
  })
  const logId = rows[0].id as number
  await db.execute({ sql: 'DELETE FROM load_log_sets WHERE log_id = ?', args: [logId] })
  for (let i = 0; i < weights.length; i++) {
    await db.execute({
      sql: 'INSERT INTO load_log_sets (log_id, set_number, weight) VALUES (?, ?, ?)',
      args: [logId, i + 1, weights[i]],
    })
  }
}

export async function getAllLoadsForExercise(userId: number, exerciseId: number): Promise<LoadLog[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? ORDER BY logged_at',
    args: [userId, exerciseId],
  })
  return Promise.all(rows.map(fetchLoadWithSets))
}
