import { useEffect, useRef, useState } from "react";
import type { PlanExercise } from "../../types";

interface Props {
	exercise: PlanExercise | null;
	onClose: () => void;
	onSaved: (exerciseId: number, weights: number[]) => void;
	getLastLoad: (
		exerciseId: number,
	) => Promise<{ sets: { weight: number }[] } | null>;
	saveLoad: (exerciseId: number, weights: number[]) => Promise<void>;
}

export function LoadModal({
	exercise,
	onClose,
	onSaved,
	getLastLoad,
	saveLoad,
}: Props) {
	const [weights, setWeights] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [open, setOpen] = useState(false);
	const inputRefs = useRef<HTMLInputElement[]>([]);

	// Parse custom reps from `extra` field (e.g. "12/10/8/6" → [12,10,8,6])
	const customReps: number[] | null = exercise?.extra
		? exercise.extra
				.split(/[/,]/)
				.map((s) => parseInt(s.trim(), 10))
				.filter((n) => !Number.isNaN(n))
		: null;

	// true = single weight for all series (fixed reps min/max)
	// false = one weight per series (custom reps OR no reps specified)
	const isFixed = !!exercise?.repsMin && !customReps;

	const inputCount = isFixed ? 1 : (customReps?.length ?? exercise?.sets ?? 3);

	function getSeriesLabel(i: number): string {
		if (isFixed) {
			const repsLabel =
				exercise?.repsMax && exercise?.repsMax !== exercise?.repsMin
					? `${exercise?.repsMin}–${exercise?.repsMax} reps`
					: `${exercise?.repsMin} reps`;
			return repsLabel;
		}
		if (customReps) {
			return `Série ${i + 1} · ${customReps[i]} reps`;
		}
		return `Série ${i + 1}`;
	}

	const [prevExerciseId, setPrevExerciseId] = useState<number | null | undefined>(exercise?.id);
	if (exercise?.id !== prevExerciseId) {
		setPrevExerciseId(exercise?.id);
		setWeights(exercise ? Array(inputCount).fill("") : []);
		setSaving(false);
	}

	useEffect(() => {
		if (exercise) {
			let active = true;

			const timer = setTimeout(() => {
				if (active) setOpen(true);
			}, 0);

			getLastLoad(exercise.exerciseId)
				.then((log) => {
					if (!active) return;
					if (log && log.sets.length > 0) {
						if (isFixed) {
							setWeights([String(log.sets[0]?.weight ?? "")]);
						} else {
							setWeights(
								Array.from({ length: inputCount }, (_, i) =>
									String(
										log.sets[i]?.weight ??
											log.sets[log.sets.length - 1]?.weight ??
											"",
									),
								),
							);
						}
					} else {
						setWeights(Array(inputCount).fill(""));
					}
					setTimeout(() => {
						if (!active) return;
						const firstEmpty = inputRefs.current
							.slice(0, inputCount)
							.find((inp) => inp && !inp.value);
						if (firstEmpty) firstEmpty.focus();
					}, 350);
				})
				.catch((err) => {
					console.error("Erro ao obter última carga:", err);
					if (active) {
						setWeights(Array(inputCount).fill(""));
					}
				});

			return () => {
				active = false;
				clearTimeout(timer);
			};
		}

		// Cleanup when closed
		const timer = setTimeout(() => setOpen(false), 0);
		return () => clearTimeout(timer);
	}, [exercise, getLastLoad, inputCount, isFixed]);

	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	async function handleSave() {
		if (!exercise) return;
		const setCount = exercise.sets ?? 3;
		const parsed = isFixed
			? Array(setCount).fill(parseFloat(weights[0]) || 0)
			: weights.map((w) => parseFloat(w) || 0);
		setSaving(true);
		try {
			await saveLoad(exercise.exerciseId, parsed);
			onSaved(exercise.exerciseId, parsed);
		} catch (err) {
			console.error("Erro ao salvar carga:", err);
		} finally {
			setSaving(false);
			handleClose();
		}
	}

	function handleClose() {
		setOpen(false);
		setWeights([]);
		setSaving(false);
		setTimeout(onClose, 300);
	}

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	};

	const setCount = exercise?.sets ?? 3;

	return (
		// biome-ignore lint/a11y/useSemanticElements: backdrop div wraps dialog and handles closing click events, button is not semantic here
		<div
			className="fixed inset-0 z-10000 flex items-end justify-center transition-opacity duration-250"
			style={{
				background: "rgba(0,0,0,0.7)",
				backdropFilter: open ? "blur(8px)" : "none",
				opacity: open ? 1 : 0,
				pointerEvents: open ? "all" : "none",
			}}
			onClick={handleBackdropClick}
			role="button"
			tabIndex={-1}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					handleClose();
				}
			}}
		>
			<div
				className="w-full max-w-150 transition-transform duration-300"
				style={{
					background: "#18181b",
					border: "1px solid var(--card-border)",
					borderRadius: "1.5rem 1.5rem 0 0",
					padding:
						"1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))",
					transform: open ? "translateY(0)" : "translateY(100%)",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				<div
					className="w-10 h-1 rounded-full mx-auto mb-5"
					style={{ background: "rgba(255,255,255,0.15)" }}
				/>
				{exercise && (
					<>
						<div
							className="text-[1rem] font-bold mb-1"
							style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
						>
							{exercise.exerciseName}
						</div>
						<div
							className="text-[0.75rem] mb-5"
							style={{ color: "var(--text-muted)" }}
						>
							{setCount} {setCount === 1 ? "série" : "séries"}
						</div>

						<div className="flex flex-col gap-3 mb-6">
							{Array.from({ length: inputCount }, (_, i) => {
								return (
									// biome-ignore lint/suspicious/noArrayIndexKey: indices are static and represent sequential workout sets
									<div key={i} className="flex items-center gap-3">
										<span
											className="text-[0.8rem] font-medium min-w-24"
											style={{ color: "var(--text-secondary)" }}
										>
											{getSeriesLabel(i)}
										</span>
										<input
											ref={(el) => {
												if (el) inputRefs.current[i] = el;
											}}
											type="number"
											inputMode="decimal"
											placeholder="0"
											value={weights[i] ?? ""}
											onChange={(e) => {
												const next = [...weights];
												next[i] = e.target.value;
												setWeights(next);
											}}
											className="flex-1 py-[0.6rem] px-3 text-[16px] font-bold text-center rounded-xl focus:outline-none transition-all"
											style={{
												background: "rgba(255,255,255,0.06)",
												border: "1px solid var(--card-border)",
												color: "var(--text-primary)",
												fontFamily: "Outfit",
											}}
											onFocus={(e) => {
												e.currentTarget.style.borderColor =
													"var(--accent-color)";
												e.currentTarget.style.background = "var(--accent-soft)";
											}}
											onBlur={(e) => {
												e.currentTarget.style.borderColor =
													"var(--card-border)";
												e.currentTarget.style.background =
													"rgba(255,255,255,0.06)";
											}}
										/>
										<span
											className="text-[0.75rem] min-w-6"
											style={{ color: "var(--text-muted)" }}
										>
											kg
										</span>
									</div>
								);
							})}
						</div>
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
							style={{
								background: "var(--accent-color)",
								color: "#000",
								fontFamily: "Outfit",
							}}
						>
							{saving
								? "Salvando..."
								: inputCount === 1
									? "Salvar Carga"
									: "Salvar Cargas"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}
