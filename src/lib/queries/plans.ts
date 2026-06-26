import type { PlanExercise, WorkoutPlan } from "../../types";
import { supabase } from "../supabase";

export async function getPlansForUser(): Promise<WorkoutPlan[]> {
	const { data, error } = await supabase
		.from("workout_plans")
		.select("*")
		.order("sort_order");
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id as number,
		userId: r.user_id as string,
		programId: r.program_id as number,
		name: r.name as string,
		suggestedDay: r.suggested_day as WorkoutPlan["suggestedDay"],
		title: r.title as string,
		extra: r.extra as string | undefined,
	}));
}

export async function getPlansForProgram(
	programId: number,
): Promise<WorkoutPlan[]> {
	const { data, error } = await supabase
		.from("workout_plans")
		.select("*")
		.eq("program_id", programId)
		.order("sort_order");
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id as number,
		userId: r.user_id as string,
		programId: r.program_id as number,
		name: r.name as string,
		suggestedDay: r.suggested_day as WorkoutPlan["suggestedDay"],
		title: r.title as string,
		extra: r.extra as string | undefined,
	}));
}

export async function getPlanExercises(
	planId: number,
): Promise<PlanExercise[]> {
	const { data, error } = await supabase
		.from("plan_exercises")
		.select(`*, exercises(name, description)`)
		.eq("plan_id", planId)
		.order("sort_order");
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id as number,
		planId: r.plan_id as number,
		exerciseId: r.exercise_id as number,
		exerciseName: (r.exercises as { name: string }).name,
		description: (r.exercises as { description?: string }).description,
		sets: r.sets as number | undefined,
		repsMin: r.reps_min as number | undefined,
		repsMax: r.reps_max as number | undefined,
		restSeconds: r.rest_seconds as number | undefined,
		muscleFocus: r.muscle_focus as string | undefined,
		executionCues: (r.execution_cues as string[]) ?? [],
		note: r.note as string | undefined,
		sortOrder: r.sort_order as number,
		isSupersetWith: r.is_superset_with as number | undefined,
		extra: r.extra as string | undefined,
	}));
}
