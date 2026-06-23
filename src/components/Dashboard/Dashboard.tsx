import { useCallback, useEffect, useMemo, useState } from "react";
import {
	deleteSession,
	getSessionsInRange,
	upsertSession,
} from "../../lib/queries/sessions";
import { supabase } from "../../lib/supabase";
import type { WorkoutSession } from "../../types";
import { EvolutionChart } from "./EvolutionChart";
import { MonthCalendar } from "./MonthCalendar";

interface Props {
	userId: string;
	onClose: () => void;
	onSessionsChanged?: () => void;
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
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const day = today.getDay();
	const sunday = new Date(today);
	sunday.setDate(today.getDate() - day);
	const currentWeekId = sunday.toISOString().split("T")[0];
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

export function Dashboard({ userId, onClose, onSessionsChanged }: Props) {
	const [sessions, setSessions] = useState<WorkoutSession[]>([]);
	const [exercises, setExercises] = useState<{ id: number; name: string }[]>(
		[],
	);
	const [month, setMonth] = useState(new Date().getMonth());
	const [year, setYear] = useState(new Date().getFullYear());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	const pad = (n: number) => String(n).padStart(2, "0");
	const from = `${year}-${pad(month + 1)}-01`;
	const to = `${year}-${pad(month + 1)}-31`;

	useEffect(() => {
		const timer = setTimeout(() => setOpen(true), 0);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		getSessionsInRange(userId, from, to).then(setSessions);
	}, [userId, from, to]);

	useEffect(() => {
		async function load() {
			const { data: logs, error } = await supabase
				.from("load_logs")
				.select("exercise_id")
				.eq("user_id", userId);
			if (error) return;
			const counts = new Map<number, number>();
			for (const row of logs ?? []) {
				const id = row.exercise_id as number;
				counts.set(id, (counts.get(id) ?? 0) + 1);
			}
			const eligible = Array.from(counts.entries())
				.filter(([, c]) => c >= 2)
				.map(([id]) => id);
			if (eligible.length === 0) {
				setExercises([]);
				return;
			}
			const { data: exData } = await supabase
				.from("exercises")
				.select("id, name")
				.in("id", eligible);
			setExercises(
				(exData ?? []).map((r) => ({
					id: r.id as number,
					name: r.name as string,
				})),
			);
		}
		load();
	}, [userId]);

	// Fetch ALL sessions for streak/total
	const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);
	useEffect(() => {
		getSessionsInRange(userId, "2000-01-01", "2099-12-31").then(setAllSessions);
	}, [userId]);

	const plannedPerWeek = useMemo(() => {
		const uniqueDays = new Set(
			allSessions.map((s) => {
				const d = new Date(`${s.performedOn}T00:00:00`);
				return d.getDay();
			}),
		);
		return Math.max(uniqueDays.size, 1);
	}, [allSessions]);

	const streak = useMemo(
		() => calcStreak(allSessions, plannedPerWeek),
		[allSessions, plannedPerWeek],
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

			let dotClass =
				"w-8 h-8 rounded-full border-[1.5px] border-[rgba(255,255,255,0.1)] bg-transparent transition-all";
			if (trained)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-[var(--accent-color)] bg-[var(--accent-color)] transition-all";
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
	}, [allSessions]);

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

	function handleExport() {
		const data = { history: allSessions, loads: {} as Record<string, unknown> };
		navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
			alert("Backup copiado!");
		});
	}

	function handleImport() {
		const str = prompt("Cole aqui o código de backup:");
		if (!str) return;
		try {
			const data = JSON.parse(str);
			if (data.history && Array.isArray(data.history)) {
				alert("Importação requer script de migração. Use yarn migrate.");
			}
		} catch {
			alert("Código inválido.");
		}
	}

	return (
		<div
			className="fixed inset-0 z-10000 overflow-y-auto mx-auto max-w-150 transition-transform duration-420"
			style={{
				background: "var(--bg-color)",
				transform: open ? "translateY(0)" : "translateY(100%)",
				transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<div className="max-w-150 mx-auto p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(2rem+var(--safe-bottom))]">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<h2
						className="text-[1.75rem] font-bold tracking-[-0.02em]"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						Resumo
					</h2>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							setTimeout(onClose, 420);
						}}
						className="w-11 h-11 flex items-center justify-center rounded-full transition-all active:bg-[rgba(255,255,255,0.1)]"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							color: "var(--text-primary)",
							fontSize: "1.1rem",
						}}
						aria-label="Fechar"
					>
						✕
					</button>
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
							Continue treinando para ver sua evolução aqui! (Mínimo 2 registros por exercício)
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

				{/* Footer Actions */}
				<div className="flex gap-2 justify-center mt-8">
					<button
						type="button"
						onClick={handleExport}
						className="py-2 px-4 rounded-lg text-[0.75rem] transition-all active:border-(--accent-color) active:text-(--accent-color)"
						style={{
							background: "transparent",
							border: "1px solid var(--card-border)",
							color: "var(--text-secondary)",
						}}
					>
						Exportar Backup
					</button>
					<button
						type="button"
						onClick={handleImport}
						className="py-2 px-4 rounded-lg text-[0.75rem] transition-all active:border-(--accent-color) active:text-(--accent-color)"
						style={{
							background: "transparent",
							border: "1px solid var(--card-border)",
							color: "var(--text-secondary)",
						}}
					>
						Importar Backup
					</button>
				</div>

				<p
					className="mt-4 text-center text-[0.7rem] opacity-50"
					style={{ color: "var(--text-muted)" }}
				>
					IRON PROTOCOL v2.0
				</p>
			</div>
		</div>
	);
}
