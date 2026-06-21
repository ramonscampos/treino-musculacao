import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { RAMON_DATA, ANDRESSA_DATA, parseSets, parseRest, type RawDayData } from './seed-data'

config({ path: '.env.local' })

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
})

async function seed() {
  console.log('Seeding...')

  await db.execute("INSERT OR IGNORE INTO users (name) VALUES ('Ramon')")
  await db.execute("INSERT OR IGNORE INTO users (name) VALUES ('Andressa')")

  const { rows: userRows } = await db.execute('SELECT id, name FROM users')
  const userMap = Object.fromEntries(userRows.map(r => [r.name as string, r.id as number]))

  // Collect unique exercises (name → first description found)
  const exDescriptions = new Map<string, string | undefined>()
  for (const d of [RAMON_DATA, ANDRESSA_DATA]) {
    for (const day of Object.values(d)) {
      for (const ex of day.exercises) {
        if (!exDescriptions.has(ex.name)) exDescriptions.set(ex.name, ex.description)
      }
    }
  }

  for (const [name, description] of exDescriptions) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO exercises (name, description) VALUES (?, ?)',
      args: [name, description ?? null],
    })
  }

  const { rows: exRows } = await db.execute('SELECT id, name FROM exercises')
  const exMap = Object.fromEntries(exRows.map(r => [r.name as string, r.id as number]))

  async function seedUser(userName: string, data: typeof RAMON_DATA) {
    const userId = userMap[userName]

    for (const [dayKey, dayData] of Object.entries(data)) {
      const result = await db.execute({
        sql: 'INSERT INTO workout_plans (user_id, name, suggested_day, title) VALUES (?, ?, ?, ?) RETURNING id',
        args: [userId, dayData.title.split('—')[1]?.trim() ?? dayKey, dayKey, dayData.title],
      })
      const planId = result.rows[0].id as number

      for (let i = 0; i < dayData.exercises.length; i++) {
        const ex = dayData.exercises[i]
        const { sets, repsMin, repsMax } = parseSets(ex.sets)
        const restSeconds = parseRest(ex.rest)
        const exerciseId = exMap[ex.name]

        await db.execute({
          sql: `INSERT INTO plan_exercises
                  (plan_id, exercise_id, sets, reps_min, reps_max, rest_seconds,
                   muscle_focus, execution_cues, note, sort_order, extra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            planId, exerciseId,
            sets ?? null, repsMin ?? null, repsMax ?? null,
            restSeconds ?? null,
            ex.muscleFocus ?? null,
            ex.executionCues ? JSON.stringify(ex.executionCues) : null,
            ex.note ?? null,
            i,
            dayData.extra ?? null,
          ],
        })
      }
    }
  }

  await seedUser('Ramon', RAMON_DATA)
  await seedUser('Andressa', ANDRESSA_DATA)

  console.log('Done.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
