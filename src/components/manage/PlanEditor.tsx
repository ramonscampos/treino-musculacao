import { useEffect, useRef, useState } from "react";
import {
	addExerciseToPlan,
	type Exercise,
	removePlanExercise,
	updatePlanExercise,
} from "../../lib/queries/manage";
import { getPlanExercises } from "../../lib/queries/plans";
import type { PlanExercise, WorkoutPlan } from "../../types";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { ExercisePicker } from "./ExercisePicker";
import { SortableExerciseList } from "./SortableExerciseList";

interface Props {
	plan: WorkoutPlan;
	onChanged: () => void;
}

function AnimateHeight({ children }: { children: React.ReactNode }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | undefined>(undefined);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		// Initial measure
		setHeight(element.scrollHeight);

		const resizeObserver = new ResizeObserver(() => {
			setHeight(element.scrollHeight);
		});
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div
			style={{
				height: height === undefined ? "auto" : `${height}px`,
				transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				overflow: "hidden",
			}}
		>
			<div ref={containerRef}>{children}</div>
		</div>
	);
}

function SkeletonExerciseRow() {
	return (
		<div
			className="flex flex-col gap-3 p-3 rounded-2xl animate-pulse"
			style={{
				background: "rgba(255,255,255,0.04)",
				border: "1px solid rgba(255,255,255,0.07)",
			}}
		>
			<div className="flex items-center justify-between gap-2">
				{/* Title skeleton */}
				<div className="h-4 bg-white/10 rounded-md w-1/2" />
				{/* Action buttons skeleton */}
				<div className="flex gap-2">
					<div className="w-7 h-7 bg-white/10 rounded-lg" />
					<div className="w-7 h-7 bg-white/10 rounded-lg" />
				</div>
			</div>
			{/* Specs details row skeleton */}
			<div className="flex gap-3">
				<div className="h-3 bg-white/10 rounded w-16" />
				<div className="h-3 bg-white/10 rounded w-16" />
				<div className="h-3 bg-white/10 rounded w-12" />
			</div>
		</div>
	);
}

export function PlanEditor({ plan, onChanged }: Props) {
	const [exercises, setExercises] = useState<PlanExercise[]>([]);
	const [showPicker, setShowPicker] = useState(false);
	const [loading, setLoading] = useState(true);

	// Modal de configuração e edição
	const [configuringExercise, setConfiguringExercise] =
		useState<Exercise | null>(null);
	const [editingPlanExercise, setEditingPlanExercise] =
		useState<PlanExercise | null>(null);
	const [modalSets, setModalSets] = useState("4");
	type RepsMode = "fixed" | "range" | "per_series";
	const [modalRepsMode, setModalRepsMode] = useState<RepsMode>("range");
	const [modalRepsFixed, setModalRepsFixed] = useState("");
	const [modalRepsMin, setModalRepsMin] = useState("");
	const [modalRepsMax, setModalRepsMax] = useState("");
	const [modalPerSeriesReps, setModalPerSeriesReps] = useState<string[]>([]);
	const [modalRestSeconds, setModalRestSeconds] = useState("60");
	const [modalNote, setModalNote] = useState("");
	const [modalMuscleFocus, setModalMuscleFocus] = useState("");
	const [modalExecutionCues, setModalExecutionCues] = useState("");
	const [modalIsSupersetWith, setModalIsSupersetWith] = useState("");

	const [prevPlanId, setPrevPlanId] = useState(plan.id);
	if (plan.id !== prevPlanId) {
		setPrevPlanId(plan.id);
		setLoading(true);
	}

	useEffect(() => {
		getPlanExercises(plan.id)
			.then(setExercises)
			.finally(() => setLoading(false));
	}, [plan.id]);

	const [prevConfigState, setPrevConfigState] = useState({
		configuring: configuringExercise,
		editing: editingPlanExercise,
	});
	if (
		configuringExercise !== prevConfigState.configuring ||
		editingPlanExercise !== prevConfigState.editing
	) {
		setPrevConfigState({ configuring: configuringExercise, editing: editingPlanExercise });
		if (!configuringExercise && !editingPlanExercise) {
			setModalSets("4");
			setModalRepsMode("range");
			setModalRepsFixed("");
			setModalRepsMin("");
			setModalRepsMax("");
			setModalPerSeriesReps([]);
			setModalRestSeconds("60");
			setModalNote("");
			setModalMuscleFocus("");
			setModalExecutionCues("");
			setModalIsSupersetWith("");
		}
	}

	function handleStartEdit(ex: PlanExercise) {
		setModalSets(ex.sets?.toString() ?? "");
		// Detect reps mode from data
		if (ex.extra) {
			const parts = ex.extra
				.split(/[/,]/)
				.map((s) => s.trim())
				.filter(Boolean);
			setModalRepsMode("per_series");
			setModalPerSeriesReps(parts);
			setModalRepsFixed("");
			setModalRepsMin("");
			setModalRepsMax("");
		} else if (
			ex.repsMin !== undefined &&
			ex.repsMax !== undefined &&
			ex.repsMin === ex.repsMax
		) {
			setModalRepsMode("fixed");
			setModalRepsFixed(ex.repsMin?.toString() ?? "");
			setModalRepsMin("");
			setModalRepsMax("");
			setModalPerSeriesReps([]);
		} else {
			setModalRepsMode("range");
			setModalRepsMin(ex.repsMin?.toString() ?? "");
			setModalRepsMax(ex.repsMax?.toString() ?? "");
			setModalRepsFixed("");
			setModalPerSeriesReps([]);
		}
		setModalRestSeconds(ex.restSeconds?.toString() ?? "");
		setModalNote(ex.note ?? "");
		setModalMuscleFocus(ex.muscleFocus ?? "");
		setModalExecutionCues(ex.executionCues?.join("\n") ?? "");
		setModalIsSupersetWith(ex.isSupersetWith?.toString() ?? "");
		setEditingPlanExercise(ex);
	}

	async function handleExerciseSelected(ex: Exercise) {
		setShowPicker(false);
		setModalSets("4");
		setModalRepsMode("range");
		setModalRepsFixed("");
		setModalRepsMin("");
		setModalRepsMax("");
		setModalPerSeriesReps([]);
		setModalRestSeconds("60");
		setModalNote("");
		setModalMuscleFocus("");
		setModalExecutionCues("");
		setModalIsSupersetWith("");
		setConfiguringExercise(ex);
	}

	async function handleAddExerciseSubmit() {
		if (!configuringExercise) return;
		const setsVal = modalSets === "" ? undefined : Number(modalSets);
		const restVal =
			modalRestSeconds === "" ? undefined : Number(modalRestSeconds);
		const cuesVal = modalExecutionCues
			.split("\n")
			.map((c) => c.trim())
			.filter((c) => c.length > 0);
		const supersetVal =
			modalIsSupersetWith === "" ? null : Number(modalIsSupersetWith);

		let repsMinVal: number | undefined;
		let repsMaxVal: number | undefined;
		let extraVal: string | undefined;

		if (modalRepsMode === "fixed") {
			const n = modalRepsFixed === "" ? undefined : Number(modalRepsFixed);
			repsMinVal = n;
			repsMaxVal = n;
		} else if (modalRepsMode === "range") {
			repsMinVal = modalRepsMin === "" ? undefined : Number(modalRepsMin);
			repsMaxVal = modalRepsMax === "" ? undefined : Number(modalRepsMax);
		} else {
			// per_series — join into e.g. "12/10/8/6"
			extraVal = modalPerSeriesReps.filter(Boolean).join("/") || undefined;
		}

		await addExerciseToPlan(plan.id, configuringExercise.id, {
			sets: setsVal,
			repsMin: repsMinVal,
			repsMax: repsMaxVal,
			restSeconds: restVal,
			extra: extraVal,
			note: modalNote || undefined,
			sortOrder: exercises.length,
			muscleFocus: modalMuscleFocus || undefined,
			executionCues: cuesVal,
			isSupersetWith: supersetVal,
		});

		setConfiguringExercise(null);
		const updated = await getPlanExercises(plan.id);
		setExercises(updated);
		onChanged();
	}

	async function handleEditExerciseSubmit() {
		if (!editingPlanExercise) return;
		const setsVal = modalSets === "" ? undefined : Number(modalSets);
		const restVal =
			modalRestSeconds === "" ? undefined : Number(modalRestSeconds);
		const cuesVal = modalExecutionCues
			.split("\n")
			.map((c) => c.trim())
			.filter((c) => c.length > 0);
		const supersetVal =
			modalIsSupersetWith === "" ? null : Number(modalIsSupersetWith);

		let repsMinVal: number | undefined;
		let repsMaxVal: number | undefined;
		let extraVal: string | null = null;

		if (modalRepsMode === "fixed") {
			const n = modalRepsFixed === "" ? undefined : Number(modalRepsFixed);
			repsMinVal = n;
			repsMaxVal = n;
		} else if (modalRepsMode === "range") {
			repsMinVal = modalRepsMin === "" ? undefined : Number(modalRepsMin);
			repsMaxVal = modalRepsMax === "" ? undefined : Number(modalRepsMax);
		} else {
			extraVal = modalPerSeriesReps.filter(Boolean).join("/") || null;
		}

		await updatePlanExercise(editingPlanExercise.id, {
			sets: setsVal,
			repsMin: repsMinVal,
			repsMax: repsMaxVal,
			restSeconds: restVal,
			extra: extraVal,
			note: modalNote || null,
			muscleFocus: modalMuscleFocus || null,
			executionCues: cuesVal,
			isSupersetWith: supersetVal,
		});

		setEditingPlanExercise(null);
		const updated = await getPlanExercises(plan.id);
		setExercises(updated);
		onChanged();
	}

	async function handleRemoveExercise(peId: number) {
		await removePlanExercise(peId);
		setExercises((prev) => prev.filter((e) => e.id !== peId));
		onChanged();
	}

	const addSupersetOptions = [
		{ value: "", label: "Nenhum" },
		...exercises.map((e) => ({
			value: e.id.toString(),
			label: e.exerciseName,
		})),
	];

	const editSupersetOptions = editingPlanExercise
		? [
				{ value: "", label: "Nenhum" },
				...exercises
					.filter((e) => e.id !== editingPlanExercise.id)
					.map((e) => ({
						value: e.id.toString(),
						label: e.exerciseName,
					})),
			]
		: [];

	return (
		<div className="flex flex-col gap-4">
			{/* Exercise list — sortable via drag & drop */}
			{loading ? (
				<div className="flex flex-col gap-3">
					<SkeletonExerciseRow />
					<SkeletonExerciseRow />
					<SkeletonExerciseRow />
				</div>
			) : (
				<SortableExerciseList
					exercises={exercises}
					onReorder={setExercises}
					onEdit={handleStartEdit}
					onRemove={handleRemoveExercise}
				/>
			)}

			{/* Add exercise */}
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
				<svg
					aria-hidden="true"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
				Adicionar exercício
			</button>

			{showPicker && (
				<Modal
					isOpen={showPicker}
					onClose={() => setShowPicker(false)}
					title="Adicionar Exercício"
				>
					<ExercisePicker
						onSelect={handleExerciseSelected}
						onCancel={() => setShowPicker(false)}
					/>
				</Modal>
			)}

			{/* Modal de Configuração do Exercício ao Adicionar */}
			{configuringExercise && (
				<Modal
					isOpen={!!configuringExercise}
					onClose={() => setConfiguringExercise(null)}
					variant="sheet"
					title={`Configurar: ${configuringExercise.name}`}
				>
					<div className="flex flex-col gap-5 text-left">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Séries
								</label>
								<input
									type="number"
									value={modalSets}
									onChange={(e) => setModalSets(e.target.value)}
									placeholder="ex: 4"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Descanso (s)
								</label>
								<input
									type="number"
									value={modalRestSeconds}
									onChange={(e) => setModalRestSeconds(e.target.value)}
									placeholder="ex: 60"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							{/* Reps mode selector */}
							<div className="flex flex-col gap-2 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Repetições
								</label>
								<div className="grid grid-cols-3 gap-2">
									{(
										[
											{
												id: "fixed" as const,
												title: "Fixa",
												desc: "Mesma rep",
												example: "ex: 10",
											},
											{
												id: "range" as const,
												title: "Min/Máx",
												desc: "Faixa alvo",
												example: "ex: 8–12",
											},
											{
												id: "per_series" as const,
												title: "Por série",
												desc: "Cada série",
												example: "12/10/8",
											},
										] as const
									).map((opt) => (
										<button
											key={opt.id}
											type="button"
											onClick={() => setModalRepsMode(opt.id)}
											className="flex flex-col items-start gap-0.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98]"
											style={{
												background:
													modalRepsMode === opt.id
														? "var(--accent-soft)"
														: "rgba(255,255,255,0.04)",
												borderColor:
													modalRepsMode === opt.id
														? "var(--accent-mute)"
														: "var(--card-border)",
											}}
										>
											<span
												className="text-[0.78rem] font-bold"
												style={{
													color:
														modalRepsMode === opt.id
															? "var(--accent-color)"
															: "var(--text-primary)",
												}}
											>
												{opt.title}
											</span>
											<span
												className="text-[0.68rem]"
												style={{ color: "var(--text-muted)" }}
											>
												{opt.desc}
											</span>
											<span
												className="text-[0.65rem] mt-0.5 font-mono"
												style={{ color: "var(--text-muted)", opacity: 0.6 }}
											>
												{opt.example}
											</span>
										</button>
									))}
								</div>
								<AnimateHeight>
									<div key={modalRepsMode} className="animate-fade-in">
										{modalRepsMode === "fixed" && (
											<input
												type="number"
												value={modalRepsFixed}
												onChange={(e) => setModalRepsFixed(e.target.value)}
												placeholder="ex: 10 reps"
												className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
												style={{
													background: "rgba(255,255,255,0.05)",
													borderColor: "var(--card-border)",
													color: "var(--text-primary)",
												}}
											/>
										)}
										{modalRepsMode === "range" && (
											<div className="grid grid-cols-2 gap-2">
												<input
													type="number"
													value={modalRepsMin}
													onChange={(e) => setModalRepsMin(e.target.value)}
													placeholder="Mín (ex: 8)"
													className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
													style={{
														background: "rgba(255,255,255,0.05)",
														borderColor: "var(--card-border)",
														color: "var(--text-primary)",
													}}
												/>
												<input
													type="number"
													value={modalRepsMax}
													onChange={(e) => setModalRepsMax(e.target.value)}
													placeholder="Máx (ex: 12)"
													className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
													style={{
														background: "rgba(255,255,255,0.05)",
														borderColor: "var(--card-border)",
														color: "var(--text-primary)",
													}}
												/>
											</div>
										)}
										{modalRepsMode === "per_series" && (
											<div className="flex flex-col gap-2">
												{Array.from(
													{ length: Math.max(Number(modalSets) || 1, 1) },
													(_, i) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: series index
														<div key={i} className="flex items-center gap-2">
															<span
																className="text-[0.75rem] font-medium min-w-16"
																style={{ color: "var(--text-muted)" }}
															>
																Série {i + 1}
															</span>
															<input
																type="number"
																value={modalPerSeriesReps[i] ?? ""}
																onChange={(e) => {
																	const next = [...modalPerSeriesReps];
																	next[i] = e.target.value;
																	setModalPerSeriesReps(next);
																}}
																placeholder="reps"
																className="flex-1 py-2 px-3 rounded-xl focus:outline-none text-[0.9rem] font-semibold border text-white"
																style={{
																	background: "rgba(255,255,255,0.05)",
																	borderColor: "var(--card-border)",
																	color: "var(--text-primary)",
																}}
															/>
															<span
																className="text-[0.72rem]"
																style={{ color: "var(--text-muted)" }}
															>
																reps
															</span>
														</div>
													),
												)}
											</div>
										)}
									</div>
								</AnimateHeight>
							</div>
							<div className="flex flex-col gap-1.5 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Observação
								</label>
								<input
									type="text"
									value={modalNote}
									onChange={(e) => setModalNote(e.target.value)}
									placeholder="ex: Cluster set. Fazer 5 e descansar 10s"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-1">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Foco Muscular
								</label>
								<input
									type="text"
									value={modalMuscleFocus}
									onChange={(e) => setModalMuscleFocus(e.target.value)}
									placeholder="ex: Quadríceps, Peito Superior"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-1">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Super-série com
								</label>
								<Select
									value={modalIsSupersetWith}
									onChange={setModalIsSupersetWith}
									options={addSupersetOptions}
									placeholder="Nenhum"
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Instruções (Uma por linha)
								</label>
								<textarea
									value={modalExecutionCues}
									onChange={(e) => setModalExecutionCues(e.target.value)}
									placeholder="ex: Cotovelos apontados levemente para dentro&#10;Contração pico no topo"
									rows={3}
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
						</div>

						<button
							type="button"
							onClick={handleAddExerciseSubmit}
							className="w-full py-3.5 font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] cursor-pointer mt-2"
							style={{
								background: "var(--accent-color)",
								color: "#000",
								fontFamily: "Outfit",
								boxShadow: "0 4px 14px var(--accent-glow)",
							}}
						>
							Adicionar ao Treino
						</button>
					</div>
				</Modal>
			)}

			{/* Modal de Edição do Exercício */}
			{editingPlanExercise && (
				<Modal
					isOpen={!!editingPlanExercise}
					onClose={() => setEditingPlanExercise(null)}
					variant="sheet"
					title={`Editar: ${editingPlanExercise.exerciseName}`}
				>
					<div className="flex flex-col gap-5 text-left animate-fade-in">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-1.5">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Séries
								</label>
								<input
									type="number"
									value={modalSets}
									onChange={(e) => setModalSets(e.target.value)}
									placeholder="ex: 4"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Descanso (s)
								</label>
								<input
									type="number"
									value={modalRestSeconds}
									onChange={(e) => setModalRestSeconds(e.target.value)}
									placeholder="ex: 60"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							{/* Reps mode selector */}
							<div className="flex flex-col gap-2 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Repetições
								</label>
								<div className="grid grid-cols-3 gap-2">
									{(
										[
											{
												id: "fixed" as const,
												title: "Fixa",
												desc: "Mesma rep",
												example: "ex: 10",
											},
											{
												id: "range" as const,
												title: "Min/Máx",
												desc: "Faixa alvo",
												example: "ex: 8–12",
											},
											{
												id: "per_series" as const,
												title: "Por série",
												desc: "Cada série",
												example: "12/10/8",
											},
										] as const
									).map((opt) => (
										<button
											key={opt.id}
											type="button"
											onClick={() => setModalRepsMode(opt.id)}
											className="flex flex-col items-start gap-0.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98]"
											style={{
												background:
													modalRepsMode === opt.id
														? "var(--accent-soft)"
														: "rgba(255,255,255,0.04)",
												borderColor:
													modalRepsMode === opt.id
														? "var(--accent-mute)"
														: "var(--card-border)",
											}}
										>
											<span
												className="text-[0.78rem] font-bold"
												style={{
													color:
														modalRepsMode === opt.id
															? "var(--accent-color)"
															: "var(--text-primary)",
												}}
											>
												{opt.title}
											</span>
											<span
												className="text-[0.68rem]"
												style={{ color: "var(--text-muted)" }}
											>
												{opt.desc}
											</span>
											<span
												className="text-[0.65rem] mt-0.5 font-mono"
												style={{ color: "var(--text-muted)", opacity: 0.6 }}
											>
												{opt.example}
											</span>
										</button>
									))}
								</div>
								<AnimateHeight>
									<div key={modalRepsMode} className="animate-fade-in">
										{modalRepsMode === "fixed" && (
											<input
												type="number"
												value={modalRepsFixed}
												onChange={(e) => setModalRepsFixed(e.target.value)}
												placeholder="ex: 10 reps"
												className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
												style={{
													background: "rgba(255,255,255,0.05)",
													borderColor: "var(--card-border)",
													color: "var(--text-primary)",
												}}
											/>
										)}
										{modalRepsMode === "range" && (
											<div className="grid grid-cols-2 gap-2">
												<input
													type="number"
													value={modalRepsMin}
													onChange={(e) => setModalRepsMin(e.target.value)}
													placeholder="Mín (ex: 8)"
													className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
													style={{
														background: "rgba(255,255,255,0.05)",
														borderColor: "var(--card-border)",
														color: "var(--text-primary)",
													}}
												/>
												<input
													type="number"
													value={modalRepsMax}
													onChange={(e) => setModalRepsMax(e.target.value)}
													placeholder="Máx (ex: 12)"
													className="w-full py-2.5 px-3 rounded-xl focus:outline-none text-[0.95rem] font-semibold border text-white"
													style={{
														background: "rgba(255,255,255,0.05)",
														borderColor: "var(--card-border)",
														color: "var(--text-primary)",
													}}
												/>
											</div>
										)}
										{modalRepsMode === "per_series" && (
											<div className="flex flex-col gap-2">
												{Array.from(
													{ length: Math.max(Number(modalSets) || 1, 1) },
													(_, i) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: series index
														<div key={i} className="flex items-center gap-2">
															<span
																className="text-[0.75rem] font-medium min-w-16"
																style={{ color: "var(--text-muted)" }}
															>
																Série {i + 1}
															</span>
															<input
																type="number"
																value={modalPerSeriesReps[i] ?? ""}
																onChange={(e) => {
																	const next = [...modalPerSeriesReps];
																	next[i] = e.target.value;
																	setModalPerSeriesReps(next);
																}}
																placeholder="reps"
																className="flex-1 py-2 px-3 rounded-xl focus:outline-none text-[0.9rem] font-semibold border text-white"
																style={{
																	background: "rgba(255,255,255,0.05)",
																	borderColor: "var(--card-border)",
																	color: "var(--text-primary)",
																}}
															/>
															<span
																className="text-[0.72rem]"
																style={{ color: "var(--text-muted)" }}
															>
																reps
															</span>
														</div>
													),
												)}
											</div>
										)}
									</div>
								</AnimateHeight>
							</div>
							<div className="flex flex-col gap-1.5 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Observação
								</label>
								<input
									type="text"
									value={modalNote}
									onChange={(e) => setModalNote(e.target.value)}
									placeholder="ex: Cluster set. Fazer 5 e descansar 10s"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-1">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Foco Muscular
								</label>
								<input
									type="text"
									value={modalMuscleFocus}
									onChange={(e) => setModalMuscleFocus(e.target.value)}
									placeholder="ex: Quadríceps, Peito Superior"
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-1">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Super-série com
								</label>
								<Select
									value={modalIsSupersetWith}
									onChange={setModalIsSupersetWith}
									options={editSupersetOptions}
									placeholder="Nenhum"
								/>
							</div>
							<div className="flex flex-col gap-1.5 col-span-2">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: visual label */}
								<label
									className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
									style={{ color: "var(--text-muted)" }}
								>
									Instruções (Uma por linha)
								</label>
								<textarea
									value={modalExecutionCues}
									onChange={(e) => setModalExecutionCues(e.target.value)}
									placeholder="ex: Cotovelos apontados levemente para dentro&#10;Contração pico no topo"
									rows={3}
									className="w-full py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-white"
									style={{
										background: "rgba(255,255,255,0.05)",
										borderColor: "var(--card-border)",
										color: "var(--text-primary)",
									}}
								/>
							</div>
						</div>

						<button
							type="button"
							onClick={handleEditExerciseSubmit}
							className="w-full py-3.5 font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] cursor-pointer mt-2"
							style={{
								background: "var(--accent-color)",
								color: "#000",
								fontFamily: "Outfit",
								boxShadow: "0 4px 14px var(--accent-glow)",
							}}
						>
							Salvar Alterações
						</button>
					</div>
				</Modal>
			)}
		</div>
	);
}
