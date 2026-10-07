import {
	type DayKey,
	formatLocalDate,
	JS_DAY_TO_KEY,
	type WorkoutPlan,
	type WorkoutSession,
} from "../types";

const DEFAULT_TRAINING_DAYS: DayKey[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

export interface TrainingSchedule {
	trainingDays: Set<DayKey>;
	fixedRestDays: Set<DayKey>;
	/** Untrained days per week (Sun–Sat) that don't count as a miss. */
	weeklyRestAllowance: number;
}

export function isRestPlan(plan: WorkoutPlan): boolean {
	return plan.extra === "descanso";
}

export function buildSchedule(
	plans: WorkoutPlan[],
	restDays = 0,
): TrainingSchedule {
	const trainingDays = new Set<DayKey>();
	const fixedRestDays = new Set<DayKey>();
	for (const plan of plans) {
		if (plan.suggestedDay === "NONE") continue;
		if (isRestPlan(plan)) fixedRestDays.add(plan.suggestedDay);
		else trainingDays.add(plan.suggestedDay);
	}
	if (trainingDays.size === 0) {
		for (const day of DEFAULT_TRAINING_DAYS) {
			if (!fixedRestDays.has(day)) trainingDays.add(day);
		}
	}
	return {
		trainingDays,
		fixedRestDays,
		weeklyRestAllowance: Math.max(restDays, fixedRestDays.size),
	};
}

function parseDate(dateStr: string): Date {
	return new Date(`${dateStr}T00:00:00`);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

/**
 * Returns the dates in [from, to] that count as a miss. Days before today
 * that weren't trained consume the weekly rest allowance first (fixed rest
 * days, then chronologically); only the remainder are misses. Days before
 * the first recorded session never count.
 */
export function getMissedDates(
	sessions: WorkoutSession[],
	schedule: TrainingSchedule,
	from: string,
	to: string,
): Set<string> {
	const missed = new Set<string>();
	if (sessions.length === 0) return missed;

	const performed = new Set(sessions.map((s) => s.performedOn));
	const firstSession = [...performed].sort()[0];
	const today = formatLocalDate(new Date());

	const start = from > firstSession ? from : firstSession;
	const startDate = parseDate(start);
	let weekStart = addDays(startDate, -startDate.getDay());

	while (formatLocalDate(weekStart) <= to && formatLocalDate(weekStart) < today) {
		const candidates: { dateStr: string; isFixedRest: boolean }[] = [];

		for (let i = 0; i < 7; i++) {
			const date = addDays(weekStart, i);
			const dateStr = formatLocalDate(date);
			if (dateStr < firstSession || dateStr >= today) continue;
			if (performed.has(dateStr)) continue;

			const dayKey = JS_DAY_TO_KEY[date.getDay()];
			const isFixedRest = schedule.fixedRestDays.has(dayKey);
			if (!isFixedRest && !schedule.trainingDays.has(dayKey)) continue;

			candidates.push({ dateStr, isFixedRest });
		}

		candidates.sort(
			(a, b) =>
				Number(b.isFixedRest) - Number(a.isFixedRest) ||
				a.dateStr.localeCompare(b.dateStr),
		);

		for (const { dateStr } of candidates.slice(schedule.weeklyRestAllowance)) {
			if (dateStr >= from && dateStr <= to) missed.add(dateStr);
		}

		weekStart = addDays(weekStart, 7);
	}

	return missed;
}

/** Consecutive days without a miss; rest days keep the streak but don't add to it. */
export function calcStreak(
	sessions: WorkoutSession[],
	schedule: TrainingSchedule,
): number {
	if (sessions.length === 0) return 0;

	const performed = new Set(sessions.map((s) => s.performedOn));
	const firstSession = [...performed].sort()[0];
	const today = formatLocalDate(new Date());
	const missed = getMissedDates(sessions, schedule, firstSession, today);

	let streak = 0;
	for (
		let date = parseDate(today);
		formatLocalDate(date) >= firstSession;
		date = addDays(date, -1)
	) {
		const dateStr = formatLocalDate(date);
		if (performed.has(dateStr)) streak++;
		else if (missed.has(dateStr)) break;
	}
	return streak;
}
