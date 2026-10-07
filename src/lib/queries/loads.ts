import { supabase } from "../supabase";

export async function getPlanLoads(
	planId: number,
): Promise<Record<number, number[]>> {
	const { data, error } = await supabase
		.from("exercise_loads")
		.select("exercise_id, weights")
		.eq("plan_id", planId);

	if (error) throw error;

	const map: Record<number, number[]> = {};
	for (const row of data ?? []) {
		map[row.exercise_id as number] = ((row.weights as number[]) ?? []).map(
			Number,
		);
	}
	return map;
}

export async function saveLoad(
	planId: number,
	exerciseId: number,
	weights: number[],
): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Not authenticated");

	const { error } = await supabase.from("exercise_loads").upsert(
		{
			user_id: user.id,
			plan_id: planId,
			exercise_id: exerciseId,
			weights,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "user_id,plan_id,exercise_id" },
	);

	if (error) throw error;
}
