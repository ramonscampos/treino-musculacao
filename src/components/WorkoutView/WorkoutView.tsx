import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoadLogs } from "../../hooks/useLoadLogs";
import { todayKey, useWorkoutPlan } from "../../hooks/useWorkoutPlan";
import { getLastLoad } from "../../lib/queries/loads";
import {
	deleteSession,
	getSessionForDate,
	getSessionsInRange,
	upsertSession,
} from "../../lib/queries/sessions";
import {
	DAY_ORDER,
	type DayKey,
	type PlanExercise,
	type User,
	type WorkoutSession,
} from "../../types";
import { Dashboard } from "../Dashboard/Dashboard";
import { LoadModal } from "../LoadModal/LoadModal";
import { DayTabs } from "./DayTabs";
import { ExerciseCard } from "./ExerciseCard";
import { StreakWidget } from "./StreakWidget";
import { WeekOverview } from "./WeekOverview";
import { WorkoutSwitcher } from "./WorkoutSwitcher";

function SkeletonCard() {
	return (
		<div
			className="flex flex-col gap-[0.6rem] py-4 px-[1.1rem] rounded-2xl border animate-pulse"
			style={{
				background: "rgba(255,255,255,0.02)",
				borderColor: "var(--card-border)",
			}}
		>
			<div className="flex justify-between items-start gap-3">
				<div className="h-[1.2rem] w-1/2 rounded bg-white/5" />
				<div className="h-[1.2rem] w-12 rounded bg-white/5" />
			</div>
			<div className="flex items-center gap-[0.6rem]">
				<div className="h-6 w-16 rounded-lg bg-white/5" />
			</div>
			<div className="flex items-center gap-2 mt-[0.4rem]">
				<div className="ml-auto h-[1.8rem] w-28 rounded-full bg-white/5" />
			</div>
		</div>
	);
}

interface Props {
	user: User;
}

function getTargetDate(dayKey: DayKey): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentDayIdx = today.getDay(); // 0 = Dom, 1 = Seg, ...
	const targetDayIdx = DAY_ORDER.indexOf(dayKey);

	const targetDate = new Date(today);
	targetDate.setDate(today.getDate() - currentDayIdx + targetDayIdx);
	return targetDate.toISOString().slice(0, 10);
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

function calcStreak(
	sessions: WorkoutSession[],
	plannedPerWeek: number,
): number {
	if (!sessions.length) return 0;
	const getWeekId = (dateStr: string) => {
		const d = new Date(`${dateStr}T00:00:00`);
		const day = d.getDay();
		const sun = new Date(d);
		sun.setDate(d.getDate() - day);
		return sun.toISOString().split("T")[0];
	};
	const weeks: Record<string, Set<string>> = {};
	sessions.forEach((s) => {
		const wid = getWeekId(s.performedOn);
		if (!weeks[wid]) weeks[wid] = new Set();
		weeks[wid].add(s.performedOn);
	});
	const sortedWeekIds = Object.keys(weeks).sort().reverse();
	const { sunday: currentWeekSunday } = getWeekRange();
	const currentWeekId = currentWeekSunday.toISOString().split("T")[0];
	let totalStreak = 0;
	for (const wid of sortedWeekIds) {
		const sessionsCount = weeks[wid].size;
		if (wid === currentWeekId) {
			totalStreak += sessionsCount;
		} else {
			if (sessionsCount >= plannedPerWeek) {
				totalStreak += plannedPerWeek;
			} else {
				break;
			}
		}
	}
	return totalStreak;
}

export function WorkoutView({ user }: Props) {
	const userId = user.id;
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const triggerRefresh = useCallback(() => {
		setRefreshTrigger((prev) => prev + 1);
	}, []);

	const {
		plans,
		selectedDay,
		setSelectedDay,
		activePlan,
		setOverridePlanId,
		exercises,
		loading,
	} = useWorkoutPlan(userId, refreshTrigger);

	const [weightsMap, setWeightsMap] = useState<Record<number, number[]>>({});
	const [loadModalEx, setLoadModalEx] = useState<PlanExercise | null>(null);
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [dashOpen, setDashOpen] = useState(false);
	const [sessionDone, setSessionDone] = useState(false);
	const [weekSessions, setWeekSessions] = useState<WorkoutSession[]>([]);
	const [streak, setStreak] = useState(0);
	const { saveLoad, getLastLoggedLoad } = useLoadLogs(userId);

	const plannedDaysCount = useMemo(
		() => plans.filter((p) => p.suggestedDay !== "DOM").length,
		[plans],
	);

	useEffect(() => {
		if (exercises.length === 0) return;
		Promise.all(
			exercises.map((ex) =>
				getLastLoad(userId, ex.exerciseId).then((log) => ({
					exerciseId: ex.exerciseId,
					weights: log?.sets.map((s) => s.weight) ?? [],
				})),
			),
		).then((results) => {
			const map: Record<number, number[]> = {};
			results.forEach((r) => {
				map[r.exerciseId] = r.weights;
			});
			setWeightsMap(map);
		});
	}, [userId, exercises]);

	useEffect(() => {
		void refreshTrigger;
		const dateStr = getTargetDate(selectedDay);
		getSessionForDate(userId, dateStr).then((s) => setSessionDone(!!s));
	}, [userId, selectedDay, refreshTrigger]);

	useEffect(() => {
		void sessionDone;
		void refreshTrigger;
		const { sunday, saturday } = getWeekRange();
		getSessionsInRange(
			userId,
			sunday.toISOString().slice(0, 10),
			saturday.toISOString().slice(0, 10),
		).then(setWeekSessions);
	}, [userId, sessionDone, refreshTrigger]);

	useEffect(() => {
		void sessionDone;
		void refreshTrigger;
		getSessionsInRange(userId, "2000-01-01", "2099-12-31").then((all) => {
			setStreak(calcStreak(all, plannedDaysCount));
		});
	}, [userId, plannedDaysCount, sessionDone, refreshTrigger]);

	async function handleToggleDone() {
		const dateStr = getTargetDate(selectedDay);
		if (sessionDone) {
			await deleteSession(userId, dateStr);
			setSessionDone(false);
			triggerRefresh();
		} else {
			if (!activePlan) return;
			await upsertSession(userId, activePlan.id, dateStr);
			setSessionDone(true);
			triggerRefresh();
		}
	}

	function handleLoadSaved(exerciseId: number, weights: number[]) {
		setWeightsMap((prev) => ({ ...prev, [exerciseId]: weights }));
	}

	const brandName =
		user.name === "Andressa" ? "Protocolo Gostosa 2.0" : "Iron Protocol";
	const headerName =
		user.name === "Andressa" ? "Treino do Mozão" : "Meu Treino";

	return (
		<div
			className="flex flex-col min-h-dvh mx-auto max-w-150"
			style={{ background: "var(--bg-color)" }}
		>
			{/* Header */}
			<header className="flex items-center justify-between px-4 sm:px-6 pt-[calc(1.5rem+var(--safe-top))] pb-2 mb-4">
				<div>
					<div
						className="text-[0.7rem] uppercase tracking-[0.2rem] font-bold"
						style={{ color: "var(--accent-color)" }}
					>
						{brandName}
					</div>
					<h1
						className="text-[1.75rem] font-bold tracking-[-0.02em] leading-tight"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						{headerName}
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<StreakWidget streak={streak} />
				</div>
			</header>

			{/* Week Overview + Dashboard Button */}
			<div className="flex gap-[0.6rem] mb-5 px-4 sm:px-6 items-stretch">
				<WeekOverview
					sessions={weekSessions}
					workoutDayCodes={plans.map((p) => p.suggestedDay)}
				/>
				<button
					type="button"
					onClick={() => setDashOpen(true)}
					className="bg-(--card-bg) border border-(--card-border) rounded-[1.25rem] min-w-13 flex items-center justify-center transition-all active:bg-[rgba(255,255,255,0.07)] active:text-(--accent-color) active:border-(--accent-mute) cursor-pointer"
					style={{ color: "var(--text-secondary)" }}
					title="Ver resumo"
					aria-label="Ver resumo"
				>
					<svg
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<title>Ver resumo</title>
						<rect x="3" y="3" width="7" height="7" rx="1.5" />
						<rect x="14" y="3" width="7" height="7" rx="1.5" />
						<rect x="3" y="14" width="7" height="7" rx="1.5" />
						<rect x="14" y="14" width="7" height="7" rx="1.5" />
					</svg>
				</button>
			</div>

			{/* Tabs */}
			<div className="px-4 sm:px-6 mb-6">
				<DayTabs
					selected={selectedDay}
					onSelect={setSelectedDay}
					todayKey={todayKey()}
				/>
			</div>

			{/* Content */}
			<main className="flex-1 px-4 sm:px-6 pb-0">
				{loading ? (
					<div
						className="animate-fade-in p-4 sm:p-6"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							borderRadius: "1.5rem",
							backdropFilter: "blur(10px)",
						}}
					>
						<div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
							<h2
								className="flex items-center gap-3 text-[1.1rem] font-bold"
								style={{ color: "var(--text-primary)" }}
							>
								<span
									className="inline-block w-1 h-[1.2rem] rounded-sm shrink-0"
									style={{
										background: "var(--accent-color)",
										boxShadow: "0 0 10px var(--accent-glow)",
									}}
								/>
								{activePlan ? (
									activePlan.name
								) : (
									<div className="h-5 w-32 rounded bg-white/5 animate-pulse" />
								)}
							</h2>
						</div>

						<div className="flex flex-col gap-3">
							<SkeletonCard />
							<SkeletonCard />
							<SkeletonCard />
						</div>
					</div>
				) : exercises.length === 0 ? (
					<div
						className="animate-fade-in p-4 sm:p-6"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							borderRadius: "1.5rem",
							backdropFilter: "blur(10px)",
						}}
					>
						<div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
							<h2
								className="flex items-center gap-3 text-[1.1rem] font-bold"
								style={{ color: "var(--text-primary)" }}
							>
								<span
									className="inline-block w-1 h-[1.2rem] rounded-sm shrink-0"
									style={{
										background: "var(--accent-color)",
										boxShadow: "0 0 10px var(--accent-glow)",
									}}
								/>
								{activePlan?.title ||
									(selectedDay === "DOM"
										? "DOMINGO — DESCANSO"
										: selectedDay === "SAB"
											? "SÁBADO — DESCANSO"
											: selectedDay === "SEG"
												? "SEGUNDA — DESCANSO"
												: selectedDay === "TER"
													? "TERÇA — DESCANSO"
													: selectedDay === "QUA"
														? "QUARTA — DESCANSO"
														: selectedDay === "QUI"
															? "QUINTA — DESCANSO"
															: "SEXTA — DESCANSO")}
							</h2>
						</div>

						<div className="flex flex-col items-center justify-center py-12 gap-6">
							<p
								className="text-center text-[0.95rem]"
								style={{ color: "var(--text-secondary)" }}
							>
								Sem musculação hoje. Aproveite o descanso! 🛌
							</p>

							{activePlan?.extra && (
								<div
									className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold"
									style={{
										background: "var(--accent-soft)",
										border: "1px dashed var(--accent-mute)",
										color: "var(--accent-color)",
									}}
								>
									<span>✨</span>
									<span>{activePlan.extra}</span>
								</div>
							)}
						</div>
					</div>
				) : (
					<div
						className="animate-fade-in p-4 sm:p-6"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							borderRadius: "1.5rem",
							backdropFilter: "blur(10px)",
						}}
					>
						<div className="flex items-center justify-between mb-5 gap-4">
							<h2
								className="flex items-center gap-3 text-[1.1rem] font-bold min-w-0"
								style={{ color: "var(--text-primary)" }}
							>
								<span
									className="inline-block w-1 h-[1.2rem] rounded-sm shrink-0"
									style={{
										background: "var(--accent-color)",
										boxShadow: "0 0 10px var(--accent-glow)",
									}}
								/>
								<span className="break-words">{activePlan?.name ?? ""}</span>
								{plans.length > 1 && (
									<button
										type="button"
										onClick={() => setSwitcherOpen(true)}
										className="p-1 rounded-md text-(--text-muted) hover:text-(--accent-color) active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
										title="Trocar treino"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<title>Trocar treino</title>
											<path d="m21 16-4 4-4-4" />
											<path d="M17 20V4" />
											<path d="m3 8 4-4 4 4" />
											<path d="M7 4v16" />
										</svg>
									</button>
								)}
							</h2>
							{exercises.length > 0 && (
								<div className="flex items-center gap-2 shrink-0 self-center">
									{sessionDone ? (
										<>
											<div
												className="w-9 h-9 flex items-center justify-center rounded-[0.65rem] text-[1.1rem] font-bold shrink-0"
												style={{
													background: "var(--success-bg)",
													border: "1.5px solid var(--success)",
													color: "var(--success)",
												}}
											>
												✓
											</div>
											<button
												type="button"
												onClick={handleToggleDone}
												className="w-9 h-9 flex items-center justify-center rounded-[0.65rem] transition-all active:scale-[0.93] shrink-0 cursor-pointer"
												style={{
													border: "1.5px solid rgba(255,78,78,0.5)",
													background: "rgba(255,78,78,0.08)",
													color: "var(--danger)",
												}}
												aria-label="Desfazer conclusão"
											>
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<title>Desfazer conclusão</title>
													<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
													<path d="M3 3v5h5" />
												</svg>
											</button>
										</>
									) : (
										<button
											type="button"
											onClick={handleToggleDone}
											className="w-9 h-9 flex items-center justify-center rounded-[0.65rem] text-[1.2rem] font-bold transition-all active:bg-(--accent-color) active:text-black active:scale-[0.97] shrink-0 cursor-pointer"
											style={{
												border: "1.5px solid var(--accent-color)",
												background: "transparent",
												color: "var(--accent-color)",
												fontFamily: "Inter",
											}}
											aria-label="Concluir treino"
										>
											+
										</button>
									)}
								</div>
							)}
						</div>

						<div className="flex flex-col gap-3">
							{exercises.map((ex) => (
								<ExerciseCard
									key={ex.id}
									exercise={ex}
									lastWeights={weightsMap[ex.exerciseId] ?? []}
									onOpenLoad={() => setLoadModalEx(ex)}
								/>
							))}
						</div>

						{activePlan?.extra && (
							<div
								className="mt-5 py-[0.85rem] px-4 rounded-2xl flex items-center gap-[0.6rem] text-[0.85rem]"
								style={{
									background: "var(--accent-soft)",
									border: "1px dashed var(--accent-mute)",
									color: "var(--accent-color)",
								}}
							>
								<span>✨</span>
								<span>{activePlan.extra}</span>
							</div>
						)}
					</div>
				)}
			</main>

			<WorkoutSwitcher
				open={switcherOpen}
				onClose={() => setSwitcherOpen(false)}
				plans={plans}
				activePlanId={activePlan?.id}
				onSelect={(planId) => setOverridePlanId(planId)}
			/>
			<LoadModal
				exercise={loadModalEx}
				onClose={() => setLoadModalEx(null)}
				onSaved={handleLoadSaved}
				getLastLoad={getLastLoggedLoad}
				saveLoad={saveLoad}
			/>
			{dashOpen && (
				<Dashboard
					userId={userId}
					onClose={() => setDashOpen(false)}
					onSessionsChanged={triggerRefresh}
				/>
			)}
		</div>
	);
}
