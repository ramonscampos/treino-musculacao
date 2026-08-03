import { useCallback, useState } from "react";
import { getLastLoad, getLoadForDate, upsertLoad } from "../lib/queries/loads";
import { todayStr } from "./useWorkoutPlan";

export function useLoadLogs(userId: string) {
	const [saving, setSaving] = useState(false);

	const saveLoad = useCallback(
		async (exerciseId: number, weights: number[], planId?: number) => {
			setSaving(true);
			try {
				await upsertLoad(userId, exerciseId, todayStr(), weights, planId);
			} finally {
				setSaving(false);
			}
		},
		[userId],
	);

	const getTodayLoad = useCallback(
		(exerciseId: number, planId?: number) =>
			getLoadForDate(userId, exerciseId, todayStr(), planId),
		[userId],
	);

	const getLastLoggedLoad = useCallback(
		(exerciseId: number, planId?: number) =>
			getLastLoad(userId, exerciseId, planId),
		[userId],
	);

	return { saveLoad, getTodayLoad, getLastLoggedLoad, saving };
}
