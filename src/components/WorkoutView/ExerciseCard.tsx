import type { PlanExercise } from "../../types";

interface Props {
	exercise: PlanExercise;
	lastWeights: number[];
	onOpenLoad: () => void;
}

function formatRest(seconds?: number): string {
	if (!seconds) return "";
	return seconds >= 60 ? `${seconds / 60}min` : `${seconds}s`;
}

function formatWeights(weights: number[]): string {
	if (weights.length === 0) return "";
	const unique = [...new Set(weights)];
	return unique.length === 1
		? `${unique[0]}`
		: weights.map((w) => w || "—").join("/");
}

export function ExerciseCard({ exercise: ex, lastWeights, onOpenLoad }: Props) {
	const hasLoad = lastWeights.length > 0 && lastWeights.some((w) => w > 0);
	const cargaDisplay = hasLoad ? formatWeights(lastWeights) : null;

	return (
		<div
			className="flex flex-col gap-[0.6rem] py-4 px-[1.1rem] rounded-2xl transition-all"
			style={{
				background: "rgba(255,255,255,0.02)",
				border: "1px solid var(--card-border)",
			}}
		>
			<div className="flex justify-between items-start gap-[0.75rem]">
				<span className="font-semibold text-[var(--text-primary)] text-[0.95rem] leading-[1.3]">
					{ex.exerciseName}
				</span>
				<span
					className="font-bold text-[0.9rem] whitespace-nowrap text-[var(--accent-color)]"
					style={{ fontFamily: "Outfit" }}
				>
					{ex.sets
						? ex.repsMin && ex.repsMax
							? ex.repsMin === ex.repsMax
								? `${ex.sets}x${ex.repsMin}`
								: `${ex.sets}x${ex.repsMin}-${ex.repsMax}`
							: ex.repsMin
								? `${ex.sets}x${ex.repsMin}`
								: `${ex.sets} séries`
						: ""}
				</span>
			</div>

			<div className="flex items-center gap-[0.6rem] flex-wrap">
				{ex.restSeconds && (
					<span className="py-[0.2rem] px-[0.6rem] rounded-[0.5rem] text-[0.75rem] bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]">
						⏱ {formatRest(ex.restSeconds)}
					</span>
				)}
				{ex.note && (
					<span className="italic text-[0.75rem] text-[var(--text-muted)]">
						{ex.note}
					</span>
				)}
			</div>

			<div className="flex items-center gap-[0.5rem] mt-[0.4rem]">
				<button
					type="button"
					onClick={onOpenLoad}
					className="ml-auto flex items-center gap-[0.35rem] py-[0.3rem] px-[0.75rem] border rounded-full transition-all active:scale-[0.96] cursor-pointer"
					style={
						hasLoad
							? {
									background: "rgba(255,255,255,0.06)",
									borderColor: "var(--card-border)",
									color: "var(--accent-color)",
									fontFamily: "Outfit",
									fontWeight: 700,
									fontSize: "0.9rem",
								}
							: {
									background: "rgba(255,255,255,0.06)",
									borderColor: "var(--card-border)",
									color: "var(--text-muted)",
									fontWeight: 400,
									fontSize: "0.8rem",
								}
					}
				>
					{hasLoad ? (
						<>
							{cargaDisplay}
							<span
								className="text-[0.65rem] font-normal ml-[2px]"
								style={{ color: "var(--text-muted)" }}
							>
								kg
							</span>
						</>
					) : (
						"Registrar carga"
					)}
				</button>
			</div>
		</div>
	);
}
