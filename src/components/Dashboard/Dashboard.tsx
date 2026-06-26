import { useCallback, useEffect, useMemo, useState } from "react";
import {
	deleteSession,
	getSessionsInRange,
	upsertSession,
} from "../../lib/queries/sessions";
import { supabase } from "../../lib/supabase";
import {
	formatLocalDate,
	JS_DAY_TO_KEY,
	type WorkoutSession,
} from "../../types";
import { EvolutionChart } from "./EvolutionChart";
import { MonthCalendar } from "./MonthCalendar";

interface Props {
	userId: string;
	onSessionsChanged?: () => void;
	restDays?: number;
	workoutDayCodes?: string[];
}

const PT_MONTHS = [
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
];

function calcStreak(
	sessions: WorkoutSession[],
	workoutDayCodes: string[] = [],
): number {
	if (!sessions.length) return 0;

	const performedDates = new Set(sessions.map((s) => s.performedOn));
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	let oldestDateStr = sessions[0].performedOn;
	for (const s of sessions) {
		if (s.performedOn < oldestDateStr) {
			oldestDateStr = s.performedOn;
		}
	}
	const oldestDate = new Date(`${oldestDateStr}T00:00:00`);
	oldestDate.setHours(0, 0, 0, 0);

	const plannedDays = workoutDayCodes.length > 0
		? workoutDayCodes
		: ["SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

	let streak = 0;
	const currentDate = new Date(today);

	while (currentDate >= oldestDate) {
		const dateStr = formatLocalDate(currentDate);
		const dayOfWeekKey = JS_DAY_TO_KEY[currentDate.getDay()];
		const isPlanned = plannedDays.includes(dayOfWeekKey);
		const workedOut = performedDates.has(dateStr);

		const isToday = currentDate.getTime() === today.getTime();

		if (workedOut) {
			streak++;
		} else {
			if (!isToday && isPlanned) {
				break;
			}
		}

		currentDate.setDate(currentDate.getDate() - 1);
	}

	return streak;
}

export function Dashboard({
	userId,
	onSessionsChanged,
	workoutDayCodes,
}: Props) {
	const [sessions, setSessions] = useState<WorkoutSession[]>([]);
	const [exercises, setExercises] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [month, setMonth] = useState(new Date().getMonth());
	const [year, setYear] = useState(new Date().getFullYear());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);
	const [loading, setLoading] = useState(true);

	const pad = (n: number) => String(n).padStart(2, "0");
	const lastDay = new Date(year, month + 1, 0).getDate();
	const from = `${year}-${pad(month + 1)}-01`;
	const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

	const [prevParams, setPrevParams] = useState({ userId, from, to });
	if (userId !== prevParams.userId || from !== prevParams.from || to !== prevParams.to) {
		setPrevParams({ userId, from, to });
		setLoading(true);
	}

	useEffect(() => {
		let active = true;

		async function loadData() {
			try {
				const loadChartExercises = async () => {
					const { data: logs, error } = await supabase
						.from("load_logs")
						.select("exercise_id")
						.eq("user_id", userId);
					if (error) return [];
					const counts = new Map<number, number>();
					for (const row of logs ?? []) {
						const id = row.exercise_id as number;
						counts.set(id, (counts.get(id) ?? 0) + 1);
					}
					const eligible = Array.from(counts.entries())
						.filter(([, c]) => c >= 2)
						.map(([id]) => id);
					if (eligible.length === 0) return [];
					const { data: exData } = await supabase
						.from("exercises")
						.select("id, name")
						.in("id", eligible);
					return (exData ?? []).map((r) => ({
						id: r.id as number,
						name: r.name as string,
					}));
				};

				const [sessionsData, allSessionsData, chartExs] = await Promise.all([
					getSessionsInRange(userId, from, to),
					getSessionsInRange(userId, "2000-01-01", "2099-12-31"),
					loadChartExercises(),
				]);

				if (!active) return;
				setSessions(sessionsData);
				setAllSessions(allSessionsData);
				setExercises(chartExs);
			} catch (err) {
				console.error("Erro ao carregar dados do painel:", err);
			} finally {
				if (active) setLoading(false);
			}
		}

		loadData();

		return () => {
			active = false;
		};
	}, [userId, from, to]);

	const streak = useMemo(
		() => calcStreak(allSessions, workoutDayCodes),
		[allSessions, workoutDayCodes],
	);

	const monthCount = useMemo(() => {
		const prefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
		return new Set(
			allSessions
				.filter((s) => s.performedOn.startsWith(prefix))
				.map((s) => s.performedOn),
		).size;
	}, [allSessions]);

	const totalCount = useMemo(
		() => new Set(allSessions.map((s) => s.performedOn)).size,
		[allSessions],
	);

	const weekDots = useMemo(() => {
		const todayObj = new Date();
		todayObj.setHours(0, 0, 0, 0);
		const dayIdx = todayObj.getDay();
		const sundayObj = new Date(todayObj);
		sundayObj.setDate(todayObj.getDate() - dayIdx);

		const weekCodes = new Set<number>();
		allSessions.forEach((s) => {
			const d = new Date(`${s.performedOn}T00:00:00`);
			if (d >= sundayObj) weekCodes.add(d.getDay());
		});
		const letters = ["D", "S", "T", "Q", "Q", "S", "S"];
		return letters.map((letter, i) => {
			const d = new Date(sundayObj);
			d.setDate(sundayObj.getDate() + i);
			const isFuture = d > todayObj;
			const isToday = d.getTime() === todayObj.getTime();
			const trained = weekCodes.has(i);

			const dayOfWeek = JS_DAY_TO_KEY[i];
			const isPlanned = (workoutDayCodes ?? []).includes(dayOfWeek);

			let dotClass =
				"w-8 h-8 rounded-full border-[1.5px] border-[rgba(255,255,255,0.1)] bg-transparent transition-all";
			if (trained)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-[var(--accent-color)] bg-[var(--accent-color)] transition-all";
			else if (!isPlanned)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.20)] bg-transparent transition-all opacity-60";
			else if (!isFuture && !isToday)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-[rgba(255,78,78,0.6)] bg-[rgba(255,78,78,0.15)] transition-all";

			if (isToday)
				dotClass +=
					" shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4px_var(--accent-mute)]";
			if (trained && isToday)
				dotClass = dotClass.replace(
					"shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4px_var(--accent-mute)]",
					"shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4px_var(--accent-color)]",
				);

			return { id: `week-dot-${i}`, letter, dotClass, trained, isToday };
		});
	}, [allSessions, workoutDayCodes]);

	function changeMonth(delta: number) {
		const d = new Date(year, month + delta, 1);
		setMonth(d.getMonth());
		setYear(d.getFullYear());
	}

	const toggleDateStatus = useCallback(
		async (dateStr: string) => {
			const isTrained = allSessions.some((s) => s.performedOn === dateStr);
			if (isTrained) {
				await deleteSession(userId, dateStr);
			} else {
				// Find a plan for this day to use as planId
				const planId = 1; // fallback
				await upsertSession(userId, planId, dateStr);
			}
			// Refresh all sessions
			const updated = await getSessionsInRange(
				userId,
				"2000-01-01",
				"2099-12-31",
			);
			setAllSessions(updated);
			const monthUpdated = await getSessionsInRange(userId, from, to);
			setSessions(monthUpdated);

			if (onSessionsChanged) {
				onSessionsChanged();
			}
		},
		[userId, allSessions, from, to, onSessionsChanged],
	);



	if (loading) {
		return (
			<div className="flex flex-col gap-6 p-6 pt-[calc(1.5rem+var(--safe-top))] pb-0 animate-pulse">
				<div>
					<div className="h-8 bg-white/10 rounded-md w-32 animate-pulse" />
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-2 gap-3 mb-6">
					{/* Streak — full width */}
					<div
						className="col-span-2 p-5 pb-4 rounded-[1.25rem] flex flex-col gap-2"
						style={{
							background: "var(--accent-soft)",
							border: "1px solid var(--accent-mute)",
						}}
					>
						<div className="h-3 bg-white/10 rounded w-28" />
						<div className="h-12 bg-white/15 rounded w-16" />
						<div className="h-3 bg-white/10 rounded w-40" />
					</div>

					{/* Este Mês */}
					<div
						className="p-5 pb-4 rounded-[1.25rem] flex flex-col gap-2"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						<div className="h-3 bg-white/10 rounded w-16" />
						<div className="h-9 bg-white/15 rounded w-10" />
						<div className="h-3 bg-white/10 rounded w-12" />
					</div>

					{/* Total Geral */}
					<div
						className="p-5 pb-4 rounded-[1.25rem] flex flex-col gap-2"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						<div className="h-3 bg-white/10 rounded w-20" />
						<div className="h-9 bg-white/15 rounded w-10" />
						<div className="h-3 bg-white/10 rounded w-12" />
					</div>

					{/* Semana Atual */}
					<div
						className="col-span-2 p-5 pb-4 rounded-[1.25rem] flex flex-col gap-3"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						<div className="h-3 bg-white/10 rounded w-24 mb-1" />
						<div className="grid grid-cols-7 gap-[0.4rem]">
							{[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
								<div key={dayIdx} className="flex flex-col items-center gap-2">
									<div className="h-2.5 bg-white/10 rounded w-3" />
									<div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Evolução de Cargas */}
				<div className="mb-8">
					<div className="h-3 bg-white/10 rounded w-36 mb-3" />
					<div
						className="p-8 rounded-[1.25rem]"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						<div className="h-32 bg-white/5 rounded-lg w-full" />
					</div>
				</div>

				{/* Frequência Mensal */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div className="h-3 bg-white/10 rounded w-32" />
						<div className="h-7 bg-white/10 rounded-full w-24" />
					</div>
					<div
						className="p-5 rounded-[1.25rem] flex flex-col gap-4"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						{/* Calendar skeleton */}
						<div className="flex justify-between items-center px-2">
							<div className="h-4 bg-white/10 rounded w-24" />
							<div className="flex gap-1">
								<div className="w-7 h-7 bg-white/10 rounded-full" />
								<div className="w-7 h-7 bg-white/10 rounded-full" />
							</div>
						</div>
						<div className="grid grid-cols-7 gap-2">
							{Array.from({ length: 35 }, (_, idx) => idx).map((slotId) => (
								<div
									key={slotId}
									className="aspect-square bg-white/5 rounded-lg"
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-6 pt-[calc(1.5rem+var(--safe-top))] pb-0 animate-fade-in">
			<div>
				<h2
					className="text-[1.75rem] font-bold tracking-[-0.02em]"
					style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
				>
					Resumo
				</h2>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-3 mb-6">
				{/* Streak — full width */}
				<div
					className="col-span-2 p-5 pb-4 rounded-[1.25rem] flex flex-col gap-1"
					style={{
						background: "var(--accent-soft)",
						border: "1px solid var(--accent-mute)",
					}}
				>
					<span className="text-[0.72rem] uppercase tracking-[0.08rem] text-(--text-muted) font-semibold">
						🔥 Sequência Atual
					</span>
					<span
						className="text-[3rem] font-bold leading-none"
						style={{ fontFamily: "Outfit", color: "var(--accent-color)" }}
					>
						{streak}
					</span>
					<span className="text-[0.75rem] text-(--text-secondary) mt-0.5">
						{streak === 1
							? "dia consecutivo treinando"
							: "dias consecutivos treinando"}
					</span>
				</div>

				{/* Este Mês */}
				<div
					className="p-5 pb-4 rounded-[1.25rem] flex flex-col gap-1"
					style={{
						background: "var(--card-bg)",
						border: "1px solid var(--card-border)",
					}}
				>
					<span className="text-[0.72rem] uppercase tracking-[0.08rem] text-(--text-muted) font-semibold">
						Este Mês
					</span>
					<span
						className="text-[2.2rem] font-bold leading-none"
						style={{ fontFamily: "Outfit", color: "var(--accent-color)" }}
					>
						{monthCount}
					</span>
					<span className="text-[0.75rem] text-(--text-secondary)">
						treinos
					</span>
				</div>

				{/* Total Geral */}
				<div
					className="p-5 pb-4 rounded-[1.25rem] flex flex-col gap-1"
					style={{
						background: "var(--card-bg)",
						border: "1px solid var(--card-border)",
					}}
				>
					<span className="text-[0.72rem] uppercase tracking-[0.08rem] text-(--text-muted) font-semibold">
						Total Geral
					</span>
					<span
						className="text-[2.2rem] font-bold leading-none"
						style={{ fontFamily: "Outfit", color: "var(--accent-color)" }}
					>
						{totalCount}
					</span>
					<span className="text-[0.75rem] text-(--text-secondary)">
						treinos
					</span>
				</div>

				{/* Semana Atual */}
				<div
					className="col-span-2 p-5 pb-4 rounded-[1.25rem] flex flex-col gap-1"
					style={{
						background: "var(--card-bg)",
						border: "1px solid var(--card-border)",
					}}
				>
					<span className="text-[0.72rem] uppercase tracking-[0.08rem] text-(--text-muted) font-semibold mb-2">
						Semana Atual
					</span>
					<div className="grid grid-cols-7 gap-[0.4rem]">
						{weekDots.map((dot) => (
							<div
								key={dot.id}
								className="flex flex-col items-center gap-[0.35rem]"
							>
								<span className="text-[0.6rem] text-(--text-muted) font-bold uppercase">
									{dot.letter}
								</span>
								<div
									className={dot.dotClass}
									style={
										dot.trained
											? { boxShadow: "0 0 10px var(--accent-glow)" }
											: undefined
									}
								/>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Evolução de Cargas */}
			<div className="mb-8">
				<p className="text-[0.7rem] uppercase tracking-[0.15rem] text-(--text-muted) font-bold mb-3">
					Evolução de cargas
				</p>
				{exercises.length > 0 ? (
					<div
						className="p-4 rounded-[1.25rem]"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
						}}
					>
						{exercises.map((ex) => (
							<EvolutionChart
								key={ex.id}
								userId={userId}
								exerciseId={ex.id}
								exerciseName={ex.name}
							/>
						))}
					</div>
				) : (
					<div
						className="p-8 rounded-[1.25rem] text-center text-[0.8rem] leading-relaxed"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							color: "var(--text-muted)",
						}}
					>
						Continue treinando para ver sua evolução aqui! (Mínimo 2 registros
						por exercício)
					</div>
				)}
			</div>

			{/* Frequência Mensal */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<p className="text-[0.7rem] uppercase tracking-[0.15rem] text-(--text-muted) font-bold">
						Frequência Mensal
					</p>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => changeMonth(-1)}
							className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:bg-(--accent-soft) active:border-(--accent-color) active:text-(--accent-color)"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid var(--card-border)",
								color: "var(--text-primary)",
							}}
							aria-label="Mês anterior"
						>
							<svg
								aria-hidden="true"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Mês anterior</title>
								<path d="m15 18-6-6 6-6" />
							</svg>
						</button>
						<span
							className="text-[0.85rem] font-bold uppercase tracking-[0.1rem]"
							style={{ color: "var(--text-primary)" }}
						>
							{PT_MONTHS[month]} {year}
						</span>
						<button
							type="button"
							onClick={() => changeMonth(1)}
							className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:bg-(--accent-soft) active:border-(--accent-color) active:text-(--accent-color)"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid var(--card-border)",
								color: "var(--text-primary)",
							}}
							aria-label="Próximo mês"
						>
							<svg
								aria-hidden="true"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Próximo mês</title>
								<path d="m9 18 6-6-6-6" />
							</svg>
						</button>
					</div>
				</div>
				<MonthCalendar
					sessions={sessions}
					month={month}
					year={year}
					selectedDate={selectedDate}
					onSelectDate={setSelectedDate}
					onToggleDate={toggleDateStatus}
				/>
			</div>
		</div>
	);
}
