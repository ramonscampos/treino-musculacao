import { useCallback, useEffect, useState } from "react";
import { getUserPrograms } from "../lib/queries/manage";
import { getPlanExercises, getPlansForUser } from "../lib/queries/plans";
import { getSessionsInRange } from "../lib/queries/sessions";
import {
	DAY_ORDER,
	type DayKey,
	formatLocalDate,
	JS_DAY_TO_KEY,
	type PlanExercise,
	type Program,
	type WorkoutPlan,
	type WorkoutSession,
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

function getWeekRange() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const day = today.getDay();
	const sunday = new Date(today);
	sunday.setDate(today.getDate() - day);
	const saturday = new Date(sunday);
	saturday.setDate(sunday.getDate() + 6);
	return { today, sunday, saturday };
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
	const [weekSessions, setWeekSessions] = useState<WorkoutSession[]>([]);

	const [prevUserId, setPrevUserId] = useState(userId);
	const [prevRefreshTrigger, setPrevRefreshTrigger] = useState(refreshTrigger);

	// Detect user or admin refresh changes to reset states and clear cache
	if (userId !== prevUserId || refreshTrigger !== prevRefreshTrigger) {
		setPrevUserId(userId);
		setPrevRefreshTrigger(refreshTrigger);
		setInitialLoading(true);
		exercisesCache.clear();
	}

	useEffect(() => {
		// Reference refreshTrigger to satisfy React Compiler dependency analysis
		void refreshTrigger;

		let active = true;
		const { sunday, saturday } = getWeekRange();

		Promise.all([
			getUserPrograms(),
			getPlansForUser(),
			getSessionsInRange(userId, formatLocalDate(sunday), formatLocalDate(saturday)),
		]).then(([p, pl, sessions]) => {
			if (!active) return;
			setPrograms(p);
			if (p.length > 0) {
				setSelectedProgramId((prev) => prev ?? p[0].id);
			}
			setPlans(pl);
			setWeekSessions(sessions);
			setInitialLoading(false);
		});

		return () => {
			active = false;
		};
	}, [userId, refreshTrigger]);

	const programPlans = selectedProgramId
		? plans.filter((p) => p.programId === selectedProgramId)
		: plans;

	const targetDate = getTargetDateStr(selectedDay);
	const activeSession = weekSessions.find((s) => s.performedOn === targetDate);
	const sessionDone = !!activeSession;

	// Derived state: Sync overridePlanId with active session when selectedDay or weekSessions changes
	const [prevDayAndSessions, setPrevDayAndSessions] = useState({
		day: selectedDay,
		sessions: weekSessions,
	});

	if (selectedDay !== prevDayAndSessions.day || weekSessions !== prevDayAndSessions.sessions) {
		setPrevDayAndSessions({ day: selectedDay, sessions: weekSessions });
		const session = weekSessions.find((s) => s.performedOn === targetDate);
		setOverridePlanId(session ? session.planId : null);
	}

	const activePlan = overridePlanId
		? programPlans.find((p) => p.id === overridePlanId)
		: programPlans.find((p) => p.suggestedDay === selectedDay);

	// Derived state: Avoid useEffect render lag for loading cached exercises
	const [renderedPlanId, setRenderedPlanId] = useState<number | null>(null);

	if (activePlan && activePlan.id !== renderedPlanId) {
		setRenderedPlanId(activePlan.id);
		const cached = exercisesCache.get(activePlan.id);
		if (cached) {
			setExercises(cached);
			setExercisesLoading(false);
		} else {
			setExercises([]);
			setExercisesLoading(true);
		}
	} else if (!activePlan && renderedPlanId !== null) {
		setRenderedPlanId(null);
		setExercises([]);
		setExercisesLoading(false);
	}

	// Fetch exercises when needed
	useEffect(() => {
		if (!activePlan) return;
		if (exercisesCache.has(activePlan.id)) return;

		let active = true;
		getPlanExercises(activePlan.id).then((ex) => {
			if (!active) return;
			exercisesCache.set(activePlan.id, ex);
			setExercises(ex);
			setExercisesLoading(false);
		});

		return () => {
			active = false;
		};
	}, [activePlan]);

	const toggleSession = useCallback((planId: number, dateStr: string, isDone: boolean) => {
		setWeekSessions((prev) => {
			if (isDone) {
				const newSession: WorkoutSession = {
					id: Date.now(), // temporary local id
					userId,
					planId,
					performedOn: dateStr,
				};
				return [...prev.filter((s) => s.performedOn !== dateStr), newSession];
			} else {
				return prev.filter((s) => s.performedOn !== dateStr);
			}
		});
	}, [userId]);

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
		exercisesLoading,
		weekSessions,
		sessionDone,
		toggleSession,
	};
}
