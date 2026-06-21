import { useMemo } from "react";
import type { WorkoutSession } from "../../types";

const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const IDX_TO_DAY = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

interface Props {
	sessions: WorkoutSession[];
	workoutDayCodes: string[]; // dias que têm treino planejado
}

export function WeekOverview({ sessions, workoutDayCodes }: Props) {
	const trainedDays = useMemo(() => {
		return new Set(
			sessions.map((s) => {
				const d = new Date(`${s.performedOn}T00:00:00`);
				return d.getDay();
			}),
		);
	}, [sessions]);

	const weekDays = useMemo(() => {
		const todayVal = new Date();
		todayVal.setHours(0, 0, 0, 0);
		const dayIdx = todayVal.getDay();

		const sundayVal = new Date(todayVal);
		sundayVal.setDate(todayVal.getDate() - dayIdx);

		return WEEK_LETTERS.map((letter, i) => {
			const d = new Date(sundayVal);
			d.setDate(sundayVal.getDate() + i);
			const isFuture = d > todayVal;
			const isToday = d.getTime() === todayVal.getTime();
			const trained = trainedDays.has(i);
			const isPlanned = workoutDayCodes.includes(IDX_TO_DAY[i]);

			let dotClass =
				"w-[26px] h-[26px] rounded-full border-2 border-[rgba(255,255,255,0.12)] bg-transparent transition-all";
			if (trained) {
				dotClass =
					"w-[26px] h-[26px] rounded-full border-2 bg-[var(--accent-color)] border-[var(--accent-color)] transition-all";
			} else if (!isPlanned) {
				dotClass =
					"w-[26px] h-[26px] rounded-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.18)] bg-transparent transition-all";
			} else if (!isFuture && !isToday) {
				dotClass =
					"w-[26px] h-[26px] rounded-full border-2 border-[rgba(255,78,78,0.6)] bg-[rgba(255,78,78,0.15)] transition-all";
			}

			if (isToday) {
				dotClass +=
					" shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4.5px_var(--accent-mute)]";
				if (trained)
					dotClass = dotClass.replace(
						"shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4.5px_var(--accent-mute)]",
						"shadow-[0_0_0_2.5px_var(--bg-color),0_0_0_4.5px_var(--accent-color)]",
					);
			}

			return {
				id: `week-overview-${i}-${letter}`,
				letter,
				trained,
				dotClass,
			};
		});
	}, [trainedDays, workoutDayCodes]);

	return (
		<div className="flex-1 flex justify-between items-center gap-[0.2rem] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[1.25rem] py-[0.85rem] px-4">
			{weekDays.map((day) => {
				return (
					<div
						key={day.id}
						className="flex flex-col items-center gap-[0.3rem] flex-1"
					>
						<span className="text-[0.62rem] text-[var(--text-muted)] font-bold uppercase">
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
