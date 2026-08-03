import type { LoadLog } from "../../types";
import { supabase } from "../supabase";

export async function getLastLoad(
	_userId: string,
	exerciseId: number,
	planId?: number,
): Promise<LoadLog | null> {
	let query = supabase
		.from("load_logs")
		.select("*, load_log_sets(*)")
		.eq("exercise_id", exerciseId);

	if (planId) {
		query = query.eq("plan_id", planId);
	}

	const { data, error } = await query
		.order("logged_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) throw error;
	if (data) return mapLog(data);

	// Fallback: if planId was specified, check for legacy logs where plan_id is null
	if (planId) {
		const { data: fallbackData } = await supabase
			.from("load_logs")
			.select("*, load_log_sets(*)")
			.eq("exercise_id", exerciseId)
			.is("plan_id", null)
			.order("logged_at", { ascending: false })
			.limit(1)
			.maybeSingle();

		if (fallbackData) return mapLog(fallbackData);
	}

	return null;
}

export async function getLoadForDate(
	_userId: string,
	exerciseId: number,
	date: string,
	planId?: number,
): Promise<LoadLog | null> {
	let query = supabase
		.from("load_logs")
		.select("*, load_log_sets(*)")
		.eq("exercise_id", exerciseId)
		.eq("logged_at", date);

	if (planId) {
		query = query.eq("plan_id", planId);
	}

	const { data, error } = await query.maybeSingle();
	if (error) throw error;
	if (!data) return null;
	return mapLog(data);
}

export async function getAllLoadsForExercise(
	_userId: string,
	exerciseId: number,
	planId?: number,
): Promise<LoadLog[]> {
	let query = supabase
		.from("load_logs")
		.select("*, load_log_sets(*)")
		.eq("exercise_id", exerciseId);

	if (planId) {
		query = query.eq("plan_id", planId);
	}

	const { data, error } = await query.order("logged_at");
	if (error) throw error;
	return (data ?? []).map(mapLog);
}

export async function upsertLoad(
	_userId: string,
	exerciseId: number,
	date: string,
	weights: number[],
	planId?: number,
): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const payload: Record<string, unknown> = {
		user_id: user.id,
		exercise_id: exerciseId,
		logged_at: date,
	};
	if (planId) {
		payload.plan_id = planId;
	}

	const onConflict = planId
		? "user_id,plan_id,exercise_id,logged_at"
		: "user_id,exercise_id,logged_at";

	const { data: log, error: logError } = await supabase
		.from("load_logs")
		.upsert(payload, { onConflict })
		.select("id")
		.single();

	if (logError) throw logError;
	if (!log) throw new Error("Failed to upsert load log");

	await supabase.from("load_log_sets").delete().eq("log_id", log.id);

	if (weights.length > 0) {
		const { error: setsError } = await supabase.from("load_log_sets").insert(
			weights.map((weight, i) => ({
				log_id: log.id,
				set_number: i + 1,
				weight,
			})),
		);
		if (setsError) throw setsError;
	}
}

function mapLog(data: Record<string, unknown>): LoadLog {
	const sets = (data.load_log_sets as Array<Record<string, unknown>>) ?? [];
	return {
		id: data.id as number,
		userId: data.user_id as string,
		exerciseId: data.exercise_id as number,
		planId: data.plan_id as number | undefined,
		loggedAt: data.logged_at as string,
		sets: sets
			.sort((a, b) => (a.set_number as number) - (b.set_number as number))
			.map((s) => ({
				id: s.id as number,
				logId: s.log_id as number,
				setNumber: s.set_number as number,
				weight: s.weight as number,
			})),
	};
}
