import { useEffect, useState } from "react";
import { getPlanExercises } from "../../lib/queries/plans";
import {
	addExerciseToPlan,
	removePlanExercise,
	updatePlan,
	updatePlanExercise,
	type Exercise,
} from "../../lib/queries/manage";
import type { DayKey, PlanExercise, WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";
import { ExercisePicker } from "./ExercisePicker";

interface Props {
	plan: WorkoutPlan;
	onBack: () => void;
	onChanged: () => void;
}

const DAYS: DayKey[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

export function PlanEditor({ plan, onBack, onChanged }: Props) {
	const [exercises, setExercises] = useState<PlanExercise[]>([]);
	const [editingName, setEditingName] = useState(false);
	const [nameValue, setNameValue] = useState(plan.name);
	const [selectedDay, setSelectedDay] = useState<DayKey>(plan.suggestedDay);
	const [showPicker, setShowPicker] = useState(false);
	const [editingExId, setEditingExId] = useState<number | null>(null);

	useEffect(() => {
		getPlanExercises(plan.id).then(setExercises);
	}, [plan.id]);

	async function handleSaveName() {
		if (nameValue.trim() === plan.name && selectedDay === plan.suggestedDay) {
			setEditingName(false);
			return;
		}
		await updatePlan(plan.id, { name: nameValue.trim(), suggestedDay: selectedDay });
		onChanged();
		setEditingName(false);
	}

	async function handleExerciseSelected(ex: Exercise) {
		setShowPicker(false);
		await addExerciseToPlan(plan.id, ex.id, { sortOrder: exercises.length });
		const updated = await getPlanExercises(plan.id);
		setExercises(updated);
		onChanged();
	}

	async function handleRemoveExercise(peId: number) {
		await removePlanExercise(peId);
		setExercises((prev) => prev.filter((e) => e.id !== peId));
		onChanged();
	}

	async function handleUpdateExercise(pe: PlanExercise, field: string, value: string) {
		const num = value === "" ? undefined : Number(value);
		const updates: Parameters<typeof updatePlanExercise>[1] = {};
		if (field === "sets") updates.sets = num;
		if (field === "repsMin") updates.repsMin = num;
		if (field === "repsMax") updates.repsMax = num;
		if (field === "restSeconds") updates.restSeconds = num;
		await updatePlanExercise(pe.id, updates);
		const updated = await getPlanExercises(plan.id);
		setExercises(updated);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Back + plan name header */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onBack}
					className="p-2 rounded-xl cursor-pointer transition-all active:opacity-60"
					style={{ color: "var(--text-secondary)" }}
					aria-label="Voltar"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>

				{editingName ? (
					<div className="flex flex-col gap-2 flex-1">
						<input
							autoFocus
							value={nameValue}
							onChange={(e) => setNameValue(e.target.value)}
							className="px-3 py-2 rounded-xl text-[0.95rem] outline-none w-full"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid var(--accent-mute)",
								color: "var(--text-primary)",
							}}
						/>
						<div className="flex gap-2 flex-wrap">
							{DAYS.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => setSelectedDay(d)}
									className="px-3 py-1 rounded-lg text-[0.8rem] font-medium cursor-pointer transition-all"
									style={{
										background: selectedDay === d ? "var(--accent-color)" : "rgba(255,255,255,0.05)",
										color: selectedDay === d ? "#000" : "var(--text-secondary)",
									}}
								>
									{DAY_LABELS[d]}
								</button>
							))}
						</div>
						<div className="flex gap-2">
							<button type="button" onClick={handleSaveName}
								className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
								style={{ background: "var(--accent-color)", color: "#000" }}>
								Salvar
							</button>
							<button type="button" onClick={() => setEditingName(false)}
								className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
								style={{ color: "var(--text-secondary)" }}>
								Cancelar
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setEditingName(true)}
						className="flex items-center gap-2 cursor-pointer group"
					>
						<span className="text-[1.1rem] font-bold" style={{ color: "var(--text-primary)" }}>
							{plan.name}
						</span>
						<span className="text-[0.75rem] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
							{DAY_LABELS[plan.suggestedDay]}
						</span>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40 group-hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
						</svg>
					</button>
				)}
			</div>

			{/* Exercise list */}
			<div className="flex flex-col gap-2">
				{exercises.map((ex) => (
					<div
						key={ex.id}
						className="flex flex-col gap-2 p-3 rounded-2xl"
						style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
					>
						<div className="flex items-center justify-between gap-2">
							<span className="text-[0.9rem] font-medium" style={{ color: "var(--text-primary)" }}>
								{ex.exerciseName}
							</span>
							<div className="flex gap-2 items-center">
								<button
									type="button"
									onClick={() => setEditingExId(editingExId === ex.id ? null : ex.id)}
									className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
									style={{ color: "var(--text-secondary)" }}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
									</svg>
								</button>
								<button
									type="button"
									onClick={() => handleRemoveExercise(ex.id)}
									className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
									style={{ color: "rgba(255,80,80,0.7)" }}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
										<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
									</svg>
								</button>
							</div>
						</div>

						{/* Inline params summary */}
						{editingExId !== ex.id && (
							<div className="flex gap-3 flex-wrap">
								{ex.sets && <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>{ex.sets} séries</span>}
								{(ex.repsMin || ex.repsMax) && (
									<span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
										{ex.repsMin}{ex.repsMax && ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ""} reps
									</span>
								)}
								{ex.restSeconds && (
									<span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
										{ex.restSeconds >= 60 ? `${Math.floor(ex.restSeconds / 60)}min` : `${ex.restSeconds}s`} descanso
									</span>
								)}
							</div>
						)}

						{/* Inline edit form */}
						{editingExId === ex.id && (
							<div className="grid grid-cols-2 gap-2 mt-1">
								{[
									{ label: "Séries", field: "sets", value: ex.sets },
									{ label: "Reps mín", field: "repsMin", value: ex.repsMin },
									{ label: "Reps máx", field: "repsMax", value: ex.repsMax },
									{ label: "Descanso (s)", field: "restSeconds", value: ex.restSeconds },
								].map(({ label, field, value }) => (
									<div key={field} className="flex flex-col gap-1">
										<label className="text-[0.72rem]" style={{ color: "var(--text-secondary)" }}>{label}</label>
										<input
											type="number"
											defaultValue={value ?? ""}
											onBlur={(e) => handleUpdateExercise(ex, field, e.target.value)}
											className="px-3 py-2 rounded-lg text-[0.85rem] outline-none w-full"
											style={{
												background: "rgba(255,255,255,0.05)",
												border: "1px solid rgba(255,255,255,0.1)",
												color: "var(--text-primary)",
											}}
										/>
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Add exercise */}
			{showPicker ? (
				<ExercisePicker
					onSelect={handleExerciseSelected}
					onCancel={() => setShowPicker(false)}
				/>
			) : (
				<button
					type="button"
					onClick={() => setShowPicker(true)}
					className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.9rem] font-medium cursor-pointer transition-all active:opacity-70"
					style={{
						border: "1.5px dashed var(--accent-mute)",
						color: "var(--accent-color)",
						background: "var(--accent-soft)",
					}}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
						<path d="M12 5v14M5 12h14" />
					</svg>
					Adicionar exercício
				</button>
			)}
		</div>
	);
}
