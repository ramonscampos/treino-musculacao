import type { WorkoutSession } from "../../types";
import { supabase } from "../supabase";

export async function getSessionForDate(
	_userId: string,
	date: string,
): Promise<WorkoutSession | null> {
	const { data, error } = await supabase
		.from("workout_sessions")
		.select("*")
		.eq("performed_on", date)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;
	return {
		id: data.id as number,
		userId: data.user_id as string,
		planId: data.plan_id as number,
		performedOn: data.performed_on as string,
	};
}

export async function upsertSession(
	_userId: string,
	planId: number,
	date: string,
): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");
	const { error } = await supabase
		.from("workout_sessions")
		.upsert(
			{ user_id: user.id, plan_id: planId, performed_on: date },
			{ onConflict: "user_id,performed_on" },
		);
	if (error) throw error;
}

export async function getSessionsInRange(
	_userId: string,
	from: string,
	to: string,
): Promise<WorkoutSession[]> {
	const { data, error } = await supabase
		.from("workout_sessions")
		.select("*")
		.gte("performed_on", from)
		.lte("performed_on", to)
		.order("performed_on");
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id as number,
		userId: r.user_id as string,
		planId: r.plan_id as number,
		performedOn: r.performed_on as string,
	}));
}

export async function deleteSession(
	_userId: string,
	date: string,
): Promise<void> {
	const { error } = await supabase
		.from("workout_sessions")
		.delete()
		.eq("performed_on", date);
	if (error) throw error;
}
