import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { readFileSync } from "fs";

config({ path: ".env.local" });

const db = createClient({
	url: process.env.VITE_TURSO_DATABASE_URL!,
	authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
});

interface OldData {
	history: { date: string; day: string }[];
	loads: Record<string, { date: string; cargas: number[] }[]>;
}

async function migrate() {
	const raw = readFileSync("scripts/localstorage-export.json", "utf-8");
	const data: OldData = JSON.parse(raw);

	const { rows: planRows } = await db.execute(
		"SELECT id, suggested_day FROM workout_plans WHERE user_id = 1",
	);
	const planByDay = Object.fromEntries(
		planRows.map((r) => [r.suggested_day as string, r.id as number]),
	);

	for (const entry of data.history) {
		const planId = planByDay[entry.day];
		if (!planId) continue;
		await db.execute({
			sql: `INSERT OR IGNORE INTO workout_sessions (user_id, plan_id, performed_on) VALUES (1, ?, ?)`,
			args: [planId, entry.date],
		});
	}

	const { rows: exRows } = await db.execute("SELECT id, name FROM exercises");
	const exByName = Object.fromEntries(
		exRows.map((r) => [r.name as string, r.id as number]),
	);

	for (const [exName, entries] of Object.entries(data.loads)) {
		const exerciseId = exByName[exName];
		if (!exerciseId) {
			console.warn(`Exercício não encontrado: ${exName}`);
			continue;
		}
		for (const entry of entries) {
			await db.execute({
				sql: `INSERT OR IGNORE INTO load_logs (user_id, exercise_id, logged_at) VALUES (1, ?, ?)`,
				args: [exerciseId, entry.date],
			});
			const { rows } = await db.execute({
				sql: `SELECT id FROM load_logs WHERE user_id = 1 AND exercise_id = ? AND logged_at = ?`,
				args: [exerciseId, entry.date],
			});
			const logId = rows[0].id as number;
			await db.execute({
				sql: `DELETE FROM load_log_sets WHERE log_id = ?`,
				args: [logId],
			});
			for (let i = 0; i < entry.cargas.length; i++) {
				await db.execute({
					sql: `INSERT INTO load_log_sets (log_id, set_number, weight) VALUES (?, ?, ?)`,
					args: [logId, i + 1, entry.cargas[i]],
				});
			}
		}
	}

	console.log("Migração concluída.");
	process.exit(0);
}

migrate().catch((e) => {
	console.error(e);
	process.exit(1);
});
