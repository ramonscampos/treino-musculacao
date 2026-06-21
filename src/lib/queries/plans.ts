import type { PlanExercise, WorkoutPlan } from "../../types";
import { db } from "../db";

export async function getPlansForUser(userId: number): Promise<WorkoutPlan[]> {
	const { rows } = await db.execute({
		sql: "SELECT * FROM workout_plans WHERE user_id = ? ORDER BY suggested_day",
		args: [userId],
	});
	return rows.map((r) => ({
		id: r.id as number,
		userId: r.user_id as number,
		name: r.name as string,
		suggestedDay: r.suggested_day as WorkoutPlan["suggestedDay"],
		title: r.title as string,
		extra: r.extra as string | undefined,
	}));
}

export async function getPlanExercises(
	planId: number,
): Promise<PlanExercise[]> {
	const { rows } = await db.execute({
		sql: `SELECT pe.*, e.name AS exercise_name, e.description AS exercise_description
          FROM plan_exercises pe
          JOIN exercises e ON e.id = pe.exercise_id
          WHERE pe.plan_id = ?
          ORDER BY pe.sort_order`,
		args: [planId],
	});
	return rows.map((r) => ({
		id: r.id as number,
		planId: r.plan_id as number,
		exerciseId: r.exercise_id as number,
		exerciseName: r.exercise_name as string,
		description: r.exercise_description as string | undefined,
		sets: r.sets as number | undefined,
		repsMin: r.reps_min as number | undefined,
		repsMax: r.reps_max as number | undefined,
		restSeconds: r.rest_seconds as number | undefined,
		muscleFocus: r.muscle_focus as string | undefined,
		executionCues: r.execution_cues
			? JSON.parse(r.execution_cues as string)
			: [],
		note: r.note as string | undefined,
		sortOrder: r.sort_order as number,
		isSupersetWith: r.is_superset_with as number | undefined,
		extra: r.extra as string | undefined,
	}));
}
