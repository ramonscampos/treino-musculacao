import { useEffect, useState } from "react";
import { getPlanExercises, getPlansForUser } from "../lib/queries/plans";
import { getSessionForDate } from "../lib/queries/sessions";
import {
	DAY_ORDER,
	type DayKey,
	JS_DAY_TO_KEY,
	type PlanExercise,
	type WorkoutPlan,
} from "../types";

function getTargetDateStr(dayKey: DayKey): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentDayIdx = today.getDay(); // 0 = Dom, 1 = Seg, ...
	const targetDayIdx = DAY_ORDER.indexOf(dayKey);

	const targetDate = new Date(today);
	targetDate.setDate(today.getDate() - currentDayIdx + targetDayIdx);
	return targetDate.toISOString().slice(0, 10);
}

export function todayKey(): DayKey {
	return JS_DAY_TO_KEY[new Date().getDay()];
}

export function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

const exercisesCache = new Map<number, PlanExercise[]>();

export function useWorkoutPlan(userId: string, refreshTrigger?: number) {
	const [plans, setPlans] = useState<WorkoutPlan[]>([]);
	const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey());
	const [overridePlanId, setOverridePlanId] = useState<number | null>(null);
	const [exercises, setExercises] = useState<PlanExercise[]>([]);
	const [loading, setLoading] = useState(true);
	const [resolvingOverride, setResolvingOverride] = useState(true);

	const [prevSelectedDay, setPrevSelectedDay] = useState(selectedDay);
	const [prevUserId, setPrevUserId] = useState(userId);
	const [prevRefreshTrigger, setPrevRefreshTrigger] = useState(refreshTrigger);

	if (
		selectedDay !== prevSelectedDay ||
		userId !== prevUserId ||
		refreshTrigger !== prevRefreshTrigger
	) {
		setPrevSelectedDay(selectedDay);
		setPrevUserId(userId);
		setPrevRefreshTrigger(refreshTrigger);
		setResolvingOverride(true);
	}

	useEffect(() => {
		exercisesCache.clear();
		getPlansForUser().then(setPlans);
	}, [userId, refreshTrigger]);

	const activePlan = resolvingOverride
		? null
		: overridePlanId
			? plans.find((p) => p.id === overridePlanId)
			: plans.find((p) => p.suggestedDay === selectedDay);

	useEffect(() => {
		if (!activePlan) {
			const timer = setTimeout(() => {
				setExercises([]);
				setLoading(false);
			}, 0);
			return () => clearTimeout(timer);
		}

		if (exercisesCache.has(activePlan.id)) {
			const timer = setTimeout(() => {
				setExercises(exercisesCache.get(activePlan.id) || []);
				setLoading(false);
			}, 0);
			return () => clearTimeout(timer);
		}

		let active = true;
		const timer = setTimeout(() => {
			if (active) setLoading(true);
		}, 0);

		getPlanExercises(activePlan.id).then((ex) => {
			if (!active) return;
			clearTimeout(timer);
			exercisesCache.set(activePlan.id, ex);
			setExercises(ex);
			setLoading(false);
		});

		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [activePlan]);

	useEffect(() => {
		void refreshTrigger;
		const targetDate = getTargetDateStr(selectedDay);
		getSessionForDate(userId, targetDate).then((s) => {
			if (s) {
				setOverridePlanId(s.planId);
			} else {
				setOverridePlanId(null);
			}
			setResolvingOverride(false);
		});
	}, [userId, selectedDay, refreshTrigger]);

	return {
		plans,
		selectedDay,
		setSelectedDay,
		activePlan,
		overridePlanId,
		setOverridePlanId,
		exercises,
		loading: loading || resolvingOverride,
	};
}
