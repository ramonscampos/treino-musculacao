import { useEffect, useState } from "react";
import { getUserPrograms } from "../lib/queries/manage";
import { getPlanExercises, getPlansForUser } from "../lib/queries/plans";
import { getSessionForDate } from "../lib/queries/sessions";
import {
	DAY_ORDER,
	type DayKey,
	formatLocalDate,
	JS_DAY_TO_KEY,
	type PlanExercise,
	type Program,
	type WorkoutPlan,
} from "../types";

function getTargetDateStr(dayKey: DayKey): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentDayIdx = today.getDay();
	const targetDayIdx = DAY_ORDER.indexOf(dayKey);

	const targetDate = new Date(today);
	targetDate.setDate(today.getDate() - currentDayIdx + targetDayIdx);
	return formatLocalDate(targetDate);
}

export function todayKey(): DayKey {
	return JS_DAY_TO_KEY[new Date().getDay()];
}

export function todayStr(): string {
	return formatLocalDate(new Date());
}

const exercisesCache = new Map<number, PlanExercise[]>();

export function useWorkoutPlan(userId: string, refreshTrigger?: number) {
	const [programs, setPrograms] = useState<Program[]>([]);
	const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
		null,
	);
	const [plans, setPlans] = useState<WorkoutPlan[]>([]);
	const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey());
	const [overridePlanId, setOverridePlanId] = useState<number | null>(null);
	const [exercises, setExercises] = useState<PlanExercise[]>([]);
	const [initialLoading, setInitialLoading] = useState(true);
	const [exercisesLoading, setExercisesLoading] = useState(true);
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
		if (userId !== prevUserId || refreshTrigger !== prevRefreshTrigger) {
			setInitialLoading(true);
		}
	}

	useEffect(() => {
		void userId;
		void refreshTrigger;
		let active = true;
		exercisesCache.clear();
		Promise.all([getUserPrograms(), getPlansForUser()]).then(([p, pl]) => {
			if (!active) return;
			setPrograms(p);
			if (p.length > 0) {
				setSelectedProgramId((prev) => prev ?? p[0].id);
			}
			setPlans(pl);
			setInitialLoading(false);
		});
		return () => {
			active = false;
		};
	}, [userId, refreshTrigger]);

	const programPlans = selectedProgramId
		? plans.filter((p) => p.programId === selectedProgramId)
		: plans;

	const activePlan = resolvingOverride
		? null
		: overridePlanId
			? programPlans.find((p) => p.id === overridePlanId)
			: programPlans.find((p) => p.suggestedDay === selectedDay);

	useEffect(() => {
		if (!activePlan) {
			const timer = setTimeout(() => {
				setExercises([]);
				setExercisesLoading(false);
			}, 0);
			return () => clearTimeout(timer);
		}

		if (exercisesCache.has(activePlan.id)) {
			const timer = setTimeout(() => {
				setExercises(exercisesCache.get(activePlan.id) || []);
				setExercisesLoading(false);
			}, 0);
			return () => clearTimeout(timer);
		}

		let active = true;
		const timer = setTimeout(() => {
			if (active) setExercisesLoading(true);
		}, 0);

		getPlanExercises(activePlan.id).then((ex) => {
			if (!active) return;
			clearTimeout(timer);
			exercisesCache.set(activePlan.id, ex);
			setExercises(ex);
			setExercisesLoading(false);
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
		programs,
		selectedProgramId,
		setSelectedProgramId,
		plans: programPlans,
		allPlans: plans,
		selectedDay,
		setSelectedDay,
		activePlan,
		overridePlanId,
		setOverridePlanId,
		exercises,
		initialLoading,
		exercisesLoading: exercisesLoading || resolvingOverride,
	};
}
