import { useCallback, useEffect, useMemo, useState } from "react";
import {
	deleteSession,
	getSessionsInRange,
	peekSessionsInRange,
	upsertSession,
} from "../../lib/queries/sessions";
import { buildSchedule, calcStreak, getMissedDates } from "../../lib/attendance";
import {
	formatLocalDate,
	JS_DAY_TO_KEY,
	type WorkoutPlan,
	type WorkoutSession,
} from "../../types";
import { useToast } from "../ui/Toast";
import { MonthCalendar } from "./MonthCalendar";

interface Props {
	userId: string;
	onSessionsChanged?: () => void;
	restDays?: number;
	plans: WorkoutPlan[];
}

const ALL_FROM = "2000-01-01";
const ALL_TO = "2099-12-31";

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

export function Dashboard({
	userId,
	onSessionsChanged,
	restDays,
	plans,
}: Props) {
	const { showToast } = useToast();
	const schedule = useMemo(
		() => buildSchedule(plans, restDays),
		[plans, restDays],
	);
	const [month, setMonth] = useState(new Date().getMonth());
	const [year, setYear] = useState(new Date().getFullYear());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [allSessions, setAllSessions] = useState<WorkoutSession[]>(
		() => peekSessionsInRange(userId, ALL_FROM, ALL_TO) ?? [],
	);
	const [loading, setLoading] = useState(
		() => !peekSessionsInRange(userId, ALL_FROM, ALL_TO),
	);

	const pad = (n: number) => String(n).padStart(2, "0");
	const lastDay = new Date(year, month + 1, 0).getDate();
	const from = `${year}-${pad(month + 1)}-01`;
	const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

	const sessions = useMemo(
		() =>
			allSessions.filter((s) => s.performedOn >= from && s.performedOn <= to),
		[allSessions, from, to],
	);

	useEffect(() => {
		let active = true;
		getSessionsInRange(userId, ALL_FROM, ALL_TO)
			.then((data) => {
				if (active) setAllSessions(data);
			})
			.catch((err) => {
				console.error("Erro ao carregar dados do painel:", err);
				if (active) showToast("Não foi possível carregar seu resumo");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [userId, showToast]);

	const streak = useMemo(
		() => calcStreak(allSessions, schedule),
		[allSessions, schedule],
	);

	const missedDates = useMemo(
		() => getMissedDates(allSessions, schedule, from, to),
		[allSessions, schedule, from, to],
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

		const weekMissed = getMissedDates(
			allSessions,
			schedule,
			formatLocalDate(sundayObj),
			formatLocalDate(todayObj),
		);
		const performedDates = new Set(allSessions.map((s) => s.performedOn));
		const letters = ["D", "S", "T", "Q", "Q", "S", "S"];
		return letters.map((letter, i) => {
			const d = new Date(sundayObj);
			d.setDate(sundayObj.getDate() + i);
			const dateStr = formatLocalDate(d);
			const isToday = d.getTime() === todayObj.getTime();
			const trained = performedDates.has(dateStr);
			const isPlanned = schedule.trainingDays.has(JS_DAY_TO_KEY[i]);

			let dotClass =
				"w-8 h-8 rounded-full border-[1.5px] border-[rgba(255,255,255,0.1)] bg-transparent transition-all";
			if (trained)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-[var(--accent-color)] bg-[var(--accent-color)] transition-all";
			else if (weekMissed.has(dateStr))
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-[rgba(255,78,78,0.6)] bg-[rgba(255,78,78,0.15)] transition-all";
			else if (!isPlanned)
				dotClass =
					"w-8 h-8 rounded-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.20)] bg-transparent transition-all opacity-60";

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
	}, [allSessions, schedule]);

	function changeMonth(delta: number) {
		const d = new Date(year, month + delta, 1);
		setMonth(d.getMonth());
		setYear(d.getFullYear());
	}

	const toggleDateStatus = useCallback(
		async (dateStr: string) => {
			const previous = allSessions.find((s) => s.performedOn === dateStr);

			const removeDate = (list: WorkoutSession[]) =>
				list.filter((s) => s.performedOn !== dateStr);
			const addSession = (session: WorkoutSession) => (list: WorkoutSession[]) =>
				[...removeDate(list), session].sort((a, b) =>
					a.performedOn.localeCompare(b.performedOn),
				);

			if (previous) {
				setAllSessions(removeDate);
				try {
					await deleteSession(userId, dateStr);
					onSessionsChanged?.();
				} catch (err) {
					console.error("Erro ao remover registro de treino:", err);
					setAllSessions(addSession(previous));
					showToast("Não foi possível remover o registro de treino");
				}
				return;
			}

			const dayKey = JS_DAY_TO_KEY[new Date(`${dateStr}T00:00:00`).getDay()];
			const plan = plans.find((p) => p.suggestedDay === dayKey) ?? plans[0];
			if (!plan) {
				showToast("Crie um treino antes de registrar sessões");
				return;
			}

			const optimistic: WorkoutSession = {
				id: -Date.now(),
				userId,
				planId: plan.id,
				performedOn: dateStr,
			};
			setAllSessions(addSession(optimistic));
			try {
				await upsertSession(userId, plan.id, dateStr);
				onSessionsChanged?.();
			} catch (err) {
				console.error("Erro ao registrar treino:", err);
				setAllSessions(removeDate);
				showToast("Não foi possível registrar o treino");
			}
		},
		[userId, allSessions, plans, onSessionsChanged, showToast],
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
							className="text-[0.72rem] sm:text-[0.85rem] font-bold uppercase tracking-[0.08rem] sm:tracking-[0.1rem]"
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
					missedDates={missedDates}
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
