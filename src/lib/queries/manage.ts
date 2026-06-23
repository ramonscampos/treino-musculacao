import { supabase } from "../supabase";
import type { Program, WorkoutPlan } from "../../types";

// --- Programs ---

export async function getUserPrograms(): Promise<Program[]> {
	const { data, error } = await supabase
		.from("programs")
		.select("*")
		.order("sort_order");
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id as number,
		userId: r.user_id as string,
		name: r.name as string,
		description: r.description as string | undefined,
	}));
}

export async function createProgram(
	name: string,
	description?: string,
): Promise<Program> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { data, error } = await supabase
		.from("programs")
		.insert({ user_id: user.id, name: name.trim(), description })
		.select()
		.single();
	if (error) throw error;
	return {
		id: data.id,
		userId: data.user_id,
		name: data.name,
		description: data.description,
	};
}

export async function updateProgram(
	id: number,
	updates: { name?: string; description?: string },
): Promise<void> {
	const payload: Record<string, unknown> = {};
	if (updates.name !== undefined) payload.name = updates.name.trim();
	if (updates.description !== undefined) payload.description = updates.description;
	const { error } = await supabase
		.from("programs")
		.update(payload)
		.eq("id", id);
	if (error) throw error;
}

export async function deleteProgram(id: number): Promise<void> {
	const { error } = await supabase.from("programs").delete().eq("id", id);
	if (error) throw error;
}

// --- Exercises (user library) ---

export interface Exercise {
	id: number;
	name: string;
	description?: string;
}

export async function getUserExercises(): Promise<Exercise[]> {
	const { data, error } = await supabase
		.from("exercises")
		.select("id, name, description")
		.order("name");
	if (error) throw error;
	return (data ?? []) as Exercise[];
}

export async function createExercise(
	name: string,
	description?: string,
): Promise<Exercise> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { data, error } = await supabase
		.from("exercises")
		.insert({ user_id: user.id, name: name.trim(), description })
		.select()
		.single();
	if (error) throw error;
	return data as Exercise;
}

export async function updateExercise(
	id: number,
	name: string,
	description?: string,
): Promise<void> {
	const { error } = await supabase
		.from("exercises")
		.update({ name: name.trim(), description })
		.eq("id", id);
	if (error) throw error;
}

export async function deleteExercise(id: number): Promise<void> {
	const { error } = await supabase.from("exercises").delete().eq("id", id);
	if (error) throw error;
}

// --- Workout Plans ---

export async function createPlan(
	programId: number,
	name: string,
	suggestedDay: WorkoutPlan["suggestedDay"],
	sortOrder: number,
): Promise<WorkoutPlan> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { data, error } = await supabase
		.from("workout_plans")
		.insert({
			user_id: user.id,
			program_id: programId,
			name: name.trim(),
			title: name.trim(),
			suggested_day: suggestedDay,
			sort_order: sortOrder,
		})
		.select()
		.single();
	if (error) throw error;
	return {
		id: data.id,
		userId: data.user_id,
		programId: data.program_id,
		name: data.name,
		suggestedDay: data.suggested_day,
		title: data.title,
		extra: data.extra,
	};
}

export async function updatePlan(
	id: number,
	updates: {
		name?: string;
		suggestedDay?: WorkoutPlan["suggestedDay"];
		extra?: string;
	},
): Promise<void> {
	const payload: Record<string, unknown> = {};
	if (updates.name !== undefined) {
		payload.name = updates.name.trim();
		payload.title = updates.name.trim();
	}
	if (updates.suggestedDay !== undefined)
		payload.suggested_day = updates.suggestedDay;
	if (updates.extra !== undefined) payload.extra = updates.extra;
	const { error } = await supabase
		.from("workout_plans")
		.update(payload)
		.eq("id", id);
	if (error) throw error;
}

export async function deletePlan(id: number): Promise<void> {
	const { error } = await supabase.from("workout_plans").delete().eq("id", id);
	if (error) throw error;
}

// --- Plan Exercises ---

export async function addExerciseToPlan(
	planId: number,
	exerciseId: number,
	params: {
		sets?: number;
		repsMin?: number;
		repsMax?: number;
		restSeconds?: number;
		muscleFocus?: string;
		note?: string;
		sortOrder: number;
	},
): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { error } = await supabase.from("plan_exercises").insert({
		user_id: user.id,
		plan_id: planId,
		exercise_id: exerciseId,
		sets: params.sets,
		reps_min: params.repsMin,
		reps_max: params.repsMax,
		rest_seconds: params.restSeconds,
		muscle_focus: params.muscleFocus,
		note: params.note,
		sort_order: params.sortOrder,
		execution_cues: [],
	});
	if (error) throw error;
}

export async function updatePlanExercise(
	id: number,
	params: {
		sets?: number;
		repsMin?: number;
		repsMax?: number;
		restSeconds?: number;
		muscleFocus?: string;
		note?: string;
		sortOrder?: number;
	},
): Promise<void> {
	const { error } = await supabase.from("plan_exercises").update({
		sets: params.sets,
		reps_min: params.repsMin,
		reps_max: params.repsMax,
		rest_seconds: params.restSeconds,
		muscle_focus: params.muscleFocus,
		note: params.note,
		sort_order: params.sortOrder,
	}).eq("id", id);
	if (error) throw error;
}

export async function removePlanExercise(id: number): Promise<void> {
	const { error } = await supabase
		.from("plan_exercises")
		.delete()
		.eq("id", id);
	if (error) throw error;
}
