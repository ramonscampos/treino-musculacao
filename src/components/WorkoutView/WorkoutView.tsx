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
	formatLocalDate,
	type PlanExercise,
	type User,
	type WorkoutSession,
} from "../../types";
import { Dashboard } from "../Dashboard/Dashboard";
import { LoadModal } from "../LoadModal/LoadModal";
import { ConfigScreen } from "../manage/ConfigScreen";
import { ManageScreen } from "../manage/ManageScreen";
import { ProgramModal } from "../manage/ProgramModal";
import { CreatePlanModal } from "./CreatePlanModal";
import { DayTabs } from "./DayTabs";
import { ExerciseCard } from "./ExerciseCard";
import { NoPlansFallback } from "./NoPlansFallback";
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
	updateThemeColor: (color: string) => Promise<void>;
	signOut: () => Promise<void>;
}

function getTargetDate(dayKey: DayKey): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const currentDayIdx = today.getDay(); // 0 = Dom, 1 = Seg, ...
	const targetDayIdx = DAY_ORDER.indexOf(dayKey);

	const targetDate = new Date(today);
	targetDate.setDate(today.getDate() - currentDayIdx + targetDayIdx);
	return formatLocalDate(targetDate);
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

function calcStreak(sessions: WorkoutSession[], restDays: number): number {
	if (!sessions.length) return 0;
	const getWeekId = (dateStr: string) => {
		const d = new Date(`${dateStr}T00:00:00`);
		const day = d.getDay();
		const sun = new Date(d);
		sun.setDate(d.getDate() - day);
		return formatLocalDate(sun);
	};
	const weeks: Record<string, Set<string>> = {};
	sessions.forEach((s) => {
		const wid = getWeekId(s.performedOn);
		if (!weeks[wid]) weeks[wid] = new Set();
		weeks[wid].add(s.performedOn);
	});
	const sortedWeekIds = Object.keys(weeks).sort().reverse();
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const day = today.getDay();
	const sunday = new Date(today);
	sunday.setDate(today.getDate() - day);
	const currentWeekId = formatLocalDate(sunday);

	const plannedPerWeek = Math.max(7 - restDays, 1);
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

export function WorkoutView({ user, updateThemeColor, signOut }: Props) {
	const userId = user.id;
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const {
		programs,
		selectedProgramId,
		setSelectedProgramId,
		plans,
		allPlans,
		selectedDay,
		setSelectedDay,
		activePlan,
		setOverridePlanId,
		exercises,
		initialLoading,
		exercisesLoading,
	} = useWorkoutPlan(userId, refreshTrigger);

	const activeProgram = useMemo(
		() => programs.find((p) => p.id === selectedProgramId),
		[programs, selectedProgramId],
	);

	const triggerRefresh = useCallback(
		(newProgramId?: number) => {
			setRefreshTrigger((prev) => prev + 1);
			if (newProgramId) {
				setSelectedProgramId(newProgramId);
			}
		},
		[setSelectedProgramId],
	);

	const [weightsMap, setWeightsMap] = useState<Record<number, number[]>>({});
	const [loadModalEx, setLoadModalEx] = useState<PlanExercise | null>(null);
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<
		"home" | "summary" | "manage" | "config"
	>("home");
	const [createPlanOpen, setCreatePlanOpen] = useState(false);
	const [createProgramOpen, setCreateProgramOpen] = useState(false);
	const [sessionDone, setSessionDone] = useState(false);
	const [weekSessions, setWeekSessions] = useState<WorkoutSession[]>([]);
	const [streak, setStreak] = useState(0);
	const { saveLoad, getLastLoggedLoad } = useLoadLogs(userId);

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
			formatLocalDate(sunday),
			formatLocalDate(saturday),
		).then(setWeekSessions);
	}, [userId, sessionDone, refreshTrigger]);

	useEffect(() => {
		void sessionDone;
		void refreshTrigger;
		getSessionsInRange(userId, "2000-01-01", "2099-12-31").then((all) => {
			setStreak(calcStreak(all, activeProgram?.restDays ?? 0));
		});
	}, [userId, activeProgram, sessionDone, refreshTrigger]);

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
	const headerName = user.name === "Andressa" ? "Treino do Mozão" : user.name;

	const showLayout =
		initialLoading || (programs.length > 0 && allPlans.length > 0);

	return (
		<div
			className="flex flex-col min-h-dvh mx-auto max-w-150 pb-28"
			style={{ background: "var(--bg-color)" }}
		>
			{activeTab === "home" && (
				<>
					{/* Header */}
					<header className="flex items-center justify-between px-4 sm:px-6 pt-[calc(1.5rem+var(--safe-top))] pb-2 mb-4">
						<div className="flex items-center gap-3 min-w-0">
							{user.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt={user.name}
									className="w-11 h-11 rounded-full object-cover border shrink-0"
									style={{ borderColor: "var(--accent-mute)" }}
								/>
							) : (
								<div
									className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[1.1rem] border shrink-0"
									style={{
										borderColor: "var(--accent-mute)",
										background: "var(--accent-soft)",
										color: "var(--accent-color)",
										fontFamily: "Outfit",
									}}
								>
									{user.name.charAt(0).toUpperCase()}
								</div>
							)}
							<div className="min-w-0">
								<div
									className="text-[0.7rem] uppercase tracking-[0.2rem] font-bold truncate"
									style={{ color: "var(--accent-color)" }}
								>
									{brandName}
								</div>
								<h1
									className="text-[1.5rem] sm:text-[1.75rem] font-bold tracking-[-0.02em] leading-tight truncate"
									style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
								>
									{headerName}
								</h1>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<StreakWidget streak={streak} loading={initialLoading} />
						</div>
					</header>

					{initialLoading ? (
						<div className="px-4 sm:px-6 mb-3 animate-pulse">
							<div className="h-5 w-32 bg-white/5 rounded ml-4" />
						</div>
					) : activeProgram ? (
						<div className="px-4 sm:px-6 mb-3">
							<h2
								className="text-[1.05rem] font-bold tracking-[-0.01em] ml-4"
								style={{ color: "var(--text-secondary)", fontFamily: "Outfit" }}
							>
								{activeProgram.name}
							</h2>
						</div>
					) : null}

					{/* Week Overview */}
					{showLayout && (
						<div className="mb-5 px-4 sm:px-6">
							<WeekOverview
								sessions={weekSessions}
								workoutDayCodes={plans.map((p) => p.suggestedDay)}
								restDays={activeProgram?.restDays ?? 0}
								loading={initialLoading}
							/>
						</div>
					)}

					{/* Tabs */}
					{showLayout && (
						<div className="px-4 sm:px-6 mb-6">
							<DayTabs
								selected={selectedDay}
								onSelect={setSelectedDay}
								todayKey={todayKey()}
							/>
						</div>
					)}

					{/* Content */}
					<main className="flex-1 px-4 sm:px-6 pb-0">
						{exercisesLoading ? (
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
						) : programs.length === 0 ? (
							<NoPlansFallback
								title="Nenhum programa cadastrado"
								description="Você precisa criar um programa de treinos (ex: Treino de Hipertrofia ou Emagrecimento) para começar a utilizar o aplicativo."
								buttonText="Criar Meu Primeiro Programa"
								onCreateClick={() => setCreateProgramOpen(true)}
							/>
						) : allPlans.length === 0 ? (
							<NoPlansFallback
								title="Nenhum treino cadastrado"
								description="Este programa não possui nenhum plano de treino (ex: Peito + Tríceps) cadastrado ainda. Crie um treino para começar."
								buttonText="Criar Meu Primeiro Treino"
								onCreateClick={() => setCreatePlanOpen(true)}
							/>
						) : activePlan && activePlan.extra === "descanso" ? (
							<div
								className="animate-fade-in p-8 rounded-[1.75rem] text-center flex flex-col items-center justify-center gap-6"
								style={{
									background: "var(--card-bg)",
									border: "1px solid var(--card-border)",
									backdropFilter: "blur(10px)",
								}}
							>
								<div
									className="w-16 h-16 rounded-2xl flex items-center justify-center text-[2rem]"
									style={{
										background: "var(--accent-soft)",
										border: "1px dashed var(--accent-mute)",
										color: "var(--accent-color)",
									}}
								>
									☕
								</div>
								<div className="flex flex-col gap-2 max-w-sm">
									<h2
										className="text-[1.25rem] font-bold tracking-[-0.02em]"
										style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
									>
										Dia de Descanso
									</h2>
									<p
										className="text-[0.9rem] leading-relaxed"
										style={{ color: "var(--text-secondary)" }}
									>
										Hoje é seu dia de descanso configurado para este programa. Aproveite para recuperar as energias e regenerar as fibras musculares!
									</p>
								</div>
								{plans.length > 1 && (
									<button
										type="button"
										onClick={() => setSwitcherOpen(true)}
										className="px-5 py-2.5 rounded-xl text-[0.88rem] font-bold transition-all active:scale-[0.97] cursor-pointer"
										style={{
											background: "rgba(255,255,255,0.06)",
											border: "1px solid rgba(255,255,255,0.1)",
											color: "var(--text-primary)",
											fontFamily: "Outfit",
										}}
									>
										Treinar Mesmo Assim
									</button>
								)}
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
										className="flex items-center gap-3 text-[1.1rem] font-bold min-w-0"
										style={{ color: "var(--text-primary)" }}
									>
										<span
											className="inline-block w-1 h-[1.2rem] rounded-sm shrink-0"
											style={{
												background: "var(--accent-color)",
												boxShadow: "0 0 10px var(--accent-glow)",
											}}
										>
											<title>Indicador de status</title>
										</span>
										<span className="break-words">
											{activePlan
												? activePlan.title || activePlan.name
												: "SEM TREINO SUGERIDO"}
										</span>
										{activePlan && plans.length > 1 && (
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
								</div>

								<div className="flex flex-col items-center justify-center py-12 gap-6">
									<p
										className="text-center text-[0.95rem] max-w-xs"
										style={{ color: "var(--text-secondary)" }}
									>
										{!activePlan
											? "Não há nenhum treino sugerido para hoje. Você pode selecionar um dos treinos existentes para iniciar."
											: "Este treino não possui exercícios cadastrados. Vá em Treinos para configurar ou selecione outro treino."}
									</p>

									{(!activePlan || plans.length > 1) && (
										<button
											type="button"
											onClick={() => setSwitcherOpen(true)}
											className="px-5 py-2.5 rounded-2xl text-[0.88rem] font-bold transition-all active:scale-[0.97] cursor-pointer"
											style={{
												background: "var(--accent-color)",
												color: "#000",
												fontFamily: "Outfit",
												boxShadow: "0 4px 14px var(--accent-glow)",
											}}
										>
											{!activePlan ? "Selecionar treino" : "Trocar treino"}
										</button>
									)}

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
										<span className="break-words">
											{activePlan?.name ?? ""}
										</span>
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
											supersetTargetName={
												ex.isSupersetWith
													? exercises.find((e) => e.id === ex.isSupersetWith)
															?.exerciseName
													: undefined
											}
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
				</>
			)}

			{activeTab === "summary" && (
				<Dashboard
					userId={userId}
					onSessionsChanged={triggerRefresh}
					restDays={activeProgram?.restDays}
					workoutDayCodes={plans.map((p) => p.suggestedDay)}
				/>
			)}

			{activeTab === "manage" && (
				<ManageScreen
					programs={programs}
					activeProgramId={selectedProgramId}
					setActiveProgramId={setSelectedProgramId}
					plans={plans}
					onChanged={triggerRefresh}
					loading={initialLoading}
				/>
			)}

			{activeTab === "config" && (
				<ConfigScreen
					user={user}
					updateThemeColor={updateThemeColor}
					signOut={signOut}
				/>
			)}

			{/* Floating Bottom Tab Bar */}
			<div className="fixed bottom-4 left-4 right-4 max-w-142 mx-auto z-40">
				<nav
					className="flex justify-around items-center py-2 px-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border transition-all"
					style={{
						background: "rgba(24, 24, 27, 0.82)",
						borderColor: "var(--card-border)",
						backdropFilter: "blur(12px)",
					}}
				>
					<button
						type="button"
						onClick={() => setActiveTab("home")}
						className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl cursor-pointer transition-all active:scale-95"
						style={{
							color:
								activeTab === "home"
									? "var(--accent-color)"
									: "var(--text-secondary)",
						}}
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
						<span className="text-[0.68rem] font-bold tracking-[0.02rem]">
							Início
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("summary")}
						className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl cursor-pointer transition-all active:scale-95"
						style={{
							color:
								activeTab === "summary"
									? "var(--accent-color)"
									: "var(--text-secondary)",
						}}
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="20" x2="18" y2="10" />
							<line x1="12" y1="20" x2="12" y2="4" />
							<line x1="6" y1="20" x2="6" y2="14" />
						</svg>
						<span className="text-[0.68rem] font-bold tracking-[0.02rem]">
							Resumo
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("manage")}
						className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl cursor-pointer transition-all active:scale-95"
						style={{
							color:
								activeTab === "manage"
									? "var(--accent-color)"
									: "var(--text-secondary)",
						}}
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11" />
						</svg>
						<span className="text-[0.68rem] font-bold tracking-[0.02rem]">
							Treinos
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("config")}
						className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl cursor-pointer transition-all active:scale-95"
						style={{
							color:
								activeTab === "config"
									? "var(--accent-color)"
									: "var(--text-secondary)",
						}}
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
						<span className="text-[0.68rem] font-bold tracking-[0.02rem]">
							Config
						</span>
					</button>
				</nav>
			</div>

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
			<CreatePlanModal
				isOpen={createPlanOpen}
				onClose={() => setCreatePlanOpen(false)}
				programId={selectedProgramId}
				plansLength={allPlans.length}
				existingDays={plans.map((p) => p.suggestedDay)}
				onChanged={triggerRefresh}
			/>
			<ProgramModal
				isOpen={createProgramOpen}
				onClose={() => setCreateProgramOpen(false)}
				onChanged={triggerRefresh}
			/>
		</div>
	);
}
