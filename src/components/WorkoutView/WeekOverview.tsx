import { useMemo } from "react";
import type { WorkoutSession } from "../../types";

const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const IDX_TO_DAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

interface Props {
	sessions: WorkoutSession[];
	workoutDayCodes: string[]; // dias que têm treino planejado
	restDays: number;
	loading?: boolean;
}

export function WeekOverview({
	sessions,
	workoutDayCodes,
	restDays,
	loading,
}: Props) {
	const trainedDays = useMemo(() => {
		return new Set(
			sessions.map((s) => {
				const d = new Date(`${s.performedOn}T00:00:00`);
				return d.getDay();
			}),
		);
	}, [sessions]);

	const uncompletedPastDaysCount = useMemo(() => {
		const todayVal = new Date();
		todayVal.setHours(0, 0, 0, 0);
		const todayIdx = todayVal.getDay(); // 0 = DOM, 1 = SEG, ...

		let count = 0;
		for (let i = 0; i < todayIdx; i++) {
			if (!trainedDays.has(i)) {
				count++;
			}
		}
		return count;
	}, [trainedDays]);

	const shouldPaintRed = uncompletedPastDaysCount > restDays;

	const weekDays = useMemo(() => {
		const todayVal = new Date();
		todayVal.setHours(0, 0, 0, 0);
		const todayIdx = todayVal.getDay();

		return WEEK_LETTERS.map((letter, i) => {
			const isFuture = i > todayIdx;
			const isToday = i === todayIdx;
			const trained = trainedDays.has(i);
			const isPlanned = workoutDayCodes.includes(IDX_TO_DAY[i]);

			let dotClass: string;

			if (trained) {
				// Green / trained class
				dotClass =
					"w-[26px] h-[26px] rounded-full border-2 bg-[var(--accent-color)] border-[var(--accent-color)] transition-all";
				if (isToday) {
					dotClass +=
						" shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4.5px_var(--accent-color)] border-dashed";
				}
			} else if (isToday) {
				// Today, not trained yet
				dotClass =
					"w-[26px] h-[26px] rounded-full border-2 border-[var(--accent-color)] bg-transparent transition-all shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4.5px_var(--accent-mute)] border-dashed";
			} else if (isFuture) {
				// Future days
				if (isPlanned) {
					dotClass =
						"w-[26px] h-[26px] rounded-full border-2 border-[rgba(255,255,255,0.12)] bg-transparent transition-all";
				} else {
					dotClass =
						"w-[26px] h-[26px] rounded-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.18)] bg-transparent transition-all";
				}
			} else {
				// Past days
				if (shouldPaintRed) {
					dotClass =
						"w-[26px] h-[26px] rounded-full border-2 border-[rgba(255,78,78,0.6)] bg-[rgba(255,78,78,0.15)] transition-all";
				} else if (isPlanned) {
					dotClass =
						"w-[26px] h-[26px] rounded-full border-2 border-[rgba(255,255,255,0.12)] bg-transparent transition-all";
				} else {
					dotClass =
						"w-[26px] h-[26px] rounded-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.18)] bg-transparent transition-all";
				}
			}

			return {
				id: `week-overview-${i}-${letter}`,
				letter,
				trained,
				dotClass,
			};
		});
	}, [trainedDays, shouldPaintRed, workoutDayCodes]);

	if (loading) {
		const skeletonDays = [
			{ key: "dom", letter: "D" },
			{ key: "seg", letter: "S" },
			{ key: "ter", letter: "T" },
			{ key: "qua", letter: "Q" },
			{ key: "qui", letter: "Q" },
			{ key: "sex", letter: "S" },
			{ key: "sab", letter: "S" },
		];
		return (
			<div className="flex-1 flex justify-between items-center gap-[0.2rem] bg-(--card-bg) border border-(--card-border) rounded-[1.25rem] py-[0.85rem] px-4 animate-pulse">
				{skeletonDays.map((day) => (
					<div
						key={day.key}
						className="flex flex-col items-center gap-[0.3rem] flex-1"
					>
						<span className="text-[0.62rem] text-(--text-muted) font-bold uppercase">
							{day.letter}
						</span>
						<div className="w-6.5 h-6.5 rounded-full bg-white/5 border border-white/10" />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="flex-1 flex justify-between items-center gap-[0.2rem] bg-(--card-bg) border border-(--card-border) rounded-[1.25rem] py-[0.85rem] px-4">
			{weekDays.map((day) => {
				return (
					<div
						key={day.id}
						className="flex flex-col items-center gap-[0.3rem] flex-1"
					>
						<span className="text-[0.62rem] text-(--text-muted) font-bold uppercase">
							{day.letter}
						</span>
						<div
							className={day.dotClass}
							style={
								day.trained
									? { boxShadow: "0 0 10px var(--accent-glow)" }
									: undefined
							}
						/>
					</div>
				);
			})}
		</div>
	);
}
