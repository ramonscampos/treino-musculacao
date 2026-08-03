import type { PlanExercise } from "../../types";

interface Props {
	exercise: PlanExercise;
	lastWeights: number[];
	onOpenLoad: () => void;
	supersetTargetName?: string;
}

function formatRest(seconds?: number): string {
	if (!seconds) return "";
	return seconds >= 60 && seconds % 60 === 0
		? `${seconds / 60}min`
		: `${seconds}s`;
}

function formatWeights(weights: number[]): string {
	if (weights.length === 0) return "";
	const unique = [...new Set(weights)];
	return unique.length === 1
		? `${unique[0]}`
		: weights.map((w) => w || "—").join("/");
}

export function ExerciseCard({
	exercise: ex,
	lastWeights,
	onOpenLoad,
	supersetTargetName,
}: Props) {
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
			<div className="flex justify-between items-start gap-3">
				<div className="flex-1">
					<span className="font-semibold text-(--text-primary) text-[0.95rem] leading-[1.3]">
						{ex.exerciseName}
					</span>
					{ex.description && (
						<p
							className="text-[0.78rem] mt-0.5 leading-tight font-medium"
							style={{ color: "var(--text-secondary)" }}
						>
							{ex.description}
						</p>
					)}
				</div>
				<span
					className="font-bold text-[0.9rem] whitespace-nowrap text-(--accent-color)"
					style={{ fontFamily: "Outfit" }}
				>
					{ex.sets
						? ex.repsMin
							? ex.repsMax && ex.repsMax !== ex.repsMin
								? `${ex.sets}x${ex.repsMin}-${ex.repsMax}`
								: `${ex.sets}x${ex.repsMin}`
							: ex.extra
								? `${ex.sets}x ${ex.extra}`
								: `${ex.sets} séries`
						: ex.extra || ""}
				</span>
			</div>

			{ex.note && (
				<span className="italic text-[0.8rem] text-(--text-muted) leading-tight block mt-0.5">
					{ex.note}
				</span>
			)}

			<div className="flex items-center gap-[0.6rem] flex-wrap">
				{ex.restSeconds && (
					<span className="py-[0.2rem] px-[0.6rem] rounded-lg text-[0.75rem] bg-[rgba(255,255,255,0.05)] text-(--text-secondary)">
						⏱ {formatRest(ex.restSeconds)}
					</span>
				)}
				{ex.muscleFocus && (
					<span className="py-[0.2rem] px-[0.6rem] rounded-lg text-[0.75rem] bg-[rgba(255,255,255,0.05)] text-(--text-secondary)">
						🎯 {ex.muscleFocus}
					</span>
				)}
				{supersetTargetName && (
					<span className="py-[0.2rem] px-[0.6rem] rounded-lg text-[0.75rem] bg-[rgba(247,144,9,0.12)] text-orange-400 font-semibold border border-orange-500/20">
						🔗 Bi-set com: {supersetTargetName}
					</span>
				)}
			</div>

			{ex.executionCues && ex.executionCues.length > 0 && (
				<ul
					className="mt-0.5 space-y-1 text-[0.85rem]"
					style={{ color: "var(--text-muted)" }}
				>
					{ex.executionCues.map((cue, idx) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: cue lists are static array data from plans
							key={idx}
							className="list-none flex items-start gap-1.5 leading-normal"
						>
							<span
								className="relative top-0.75 select-none font-bold text-[0.85rem] leading-none"
								style={{ color: "var(--accent-color)" }}
							>
								›
							</span>
							<span>{cue}</span>
						</li>
					))}
				</ul>
			)}

			<div className="flex items-center gap-2 mt-[0.4rem]">
				<button
					type="button"
					onClick={onOpenLoad}
					className="ml-auto flex items-center gap-[0.35rem] py-[0.3rem] px-3 border rounded-full transition-all active:scale-[0.96] cursor-pointer"
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
								className="text-[0.65rem] font-normal ml-0.5"
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
