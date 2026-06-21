import { useCallback, useState } from "react";
import { getLoadForDate, getLastLoad, upsertLoad } from "../lib/queries/loads";
import { todayStr } from "./useWorkoutPlan";

export function useLoadLogs(userId: number) {
	const [saving, setSaving] = useState(false);

	const saveLoad = useCallback(
		async (exerciseId: number, weights: number[]) => {
			setSaving(true);
			try {
				await upsertLoad(userId, exerciseId, todayStr(), weights);
			} finally {
				setSaving(false);
			}
		},
		[userId],
	);

	const getTodayLoad = useCallback(
		(exerciseId: number) => getLoadForDate(userId, exerciseId, todayStr()),
		[userId],
	);

	const getLastLoggedLoad = useCallback(
		(exerciseId: number) => getLastLoad(userId, exerciseId),
		[userId],
	);

	return { saveLoad, getTodayLoad, getLastLoggedLoad, saving };
}
