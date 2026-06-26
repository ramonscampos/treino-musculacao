import { useEffect, useRef, useState } from "react";
import {
	createExercise,
	type Exercise,
	getUserExercises,
} from "../../lib/queries/manage";
import { Modal } from "../ui/Modal";

interface Props {
	onSelect: (exercise: Exercise) => void;
	onCancel: () => void;
}

export function ExercisePicker({ onSelect, onCancel }: Props) {
	const [query, setQuery] = useState("");
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [creating, setCreating] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newExerciseName, setNewExerciseName] = useState("");
	const [newExerciseDesc, setNewExerciseDesc] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getUserExercises()
			.then(setExercises)
			.finally(() => setLoading(false));
		setTimeout(() => inputRef.current?.focus(), 50);
	}, []);

	const [prevShowCreateForm, setPrevShowCreateForm] = useState(showCreateForm);
	if (showCreateForm !== prevShowCreateForm) {
		setPrevShowCreateForm(showCreateForm);
		if (!showCreateForm) {
			setNewExerciseName("");
			setNewExerciseDesc("");
		}
	}

	const filtered = exercises.filter((e) =>
		e.name.toLowerCase().includes(query.toLowerCase()),
	);
	const exactMatch = exercises.some(
		(e) => e.name.toLowerCase() === query.toLowerCase(),
	);
	const showCreate = query.trim().length > 0 && !exactMatch;

	async function handleCreate() {
		if (!query.trim()) return;
		setCreating(true);
		try {
			const exercise = await createExercise(query.trim());
			onSelect(exercise);
		} finally {
			setCreating(false);
		}
	}

	async function handleCreateNew() {
		if (!newExerciseName.trim()) return;
		setCreating(true);
		try {
			const exercise = await createExercise(
				newExerciseName.trim(),
				newExerciseDesc.trim() || undefined,
			);
			onSelect(exercise);
			setShowCreateForm(false);
		} catch (err) {
			console.error("Erro ao cadastrar exercício:", err);
		} finally {
			setCreating(false);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<input
				ref={inputRef}
				type="text"
				placeholder="Buscar exercício..."
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				className="w-full px-4 py-3 rounded-xl text-[0.95rem] outline-none"
				style={{
					background: "rgba(255,255,255,0.05)",
					border: "1px solid rgba(255,255,255,0.1)",
					color: "var(--text-primary)",
				}}
			/>

			<div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
				{loading ? (
					<div className="flex flex-col gap-2 animate-pulse">
						<div className="h-11 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
						<div className="h-11 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
						<div className="h-11 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
						<div className="h-11 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
					</div>
				) : (
					<>
						{query.trim().length === 0 && (
							<button
								type="button"
								onClick={() => {
									setNewExerciseName("");
									setNewExerciseDesc("");
									setShowCreateForm(true);
								}}
								className="text-left px-4 py-3 rounded-xl text-[0.9rem] font-bold transition-all active:opacity-70 cursor-pointer border border-dashed mb-1.5 flex items-center justify-between"
								style={{
									borderColor: "var(--accent-mute)",
									background: "var(--accent-soft)",
									color: "var(--accent-color)",
								}}
							>
								<span>+ Adicionar Novo Exercício</span>
								<span className="text-[0.75rem] opacity-75 font-normal">
									Criar personalizado
								</span>
							</button>
						)}

						{filtered.map((ex) => (
							<button
								key={ex.id}
								type="button"
								onClick={() => onSelect(ex)}
								className="text-left px-4 py-3 rounded-xl text-[0.9rem] transition-all active:opacity-70 cursor-pointer"
								style={{
									background: "rgba(255,255,255,0.04)",
									color: "var(--text-primary)",
								}}
							>
								{ex.name}
							</button>
						))}

						{showCreate && (
							<button
								type="button"
								onClick={handleCreate}
								disabled={creating}
								className="text-left px-4 py-3 rounded-xl text-[0.9rem] font-medium transition-all active:opacity-70 cursor-pointer mt-1"
								style={{
									background: "var(--accent-soft)",
									border: "1px dashed var(--accent-mute)",
									color: "var(--accent-color)",
								}}
							>
								{creating ? "Criando..." : `Adicionar "${query.trim()}"`}
							</button>
						)}

						{filtered.length === 0 && !showCreate && (
							<div className="flex flex-col items-center gap-3 py-6">
								<p
									className="text-center text-[0.85rem]"
									style={{ color: "var(--text-secondary)" }}
								>
									Nenhum exercício encontrado.
								</p>
								{query.trim().length > 0 && (
									<button
										type="button"
										onClick={() => {
											setNewExerciseName(query);
											setNewExerciseDesc("");
											setShowCreateForm(true);
										}}
										className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold transition-all active:scale-95 cursor-pointer border"
										style={{
											borderColor: "var(--accent-color)",
											background: "var(--accent-soft)",
											color: "var(--accent-color)",
										}}
									>
										+ Adicionar "{query}"
									</button>
								)}
							</div>
						)}
					</>
				)}
			</div>

			<button
				type="button"
				onClick={onCancel}
				className="text-[0.85rem] py-2 cursor-pointer"
				style={{ color: "var(--text-secondary)" }}
			>
				Cancelar
			</button>

			<Modal
				isOpen={showCreateForm}
				onClose={() => setShowCreateForm(false)}
				title="Adicionar Novo Exercício"
			>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2.5">
						<span
							className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
							style={{ color: "var(--text-muted)" }}
						>
							Nome do Exercício
						</span>
						<input
							type="text"
							placeholder="Nome do exercício (ex: Supino Reto)"
							value={newExerciseName}
							onChange={(e) => setNewExerciseName(e.target.value)}
							className="w-full px-4 py-3 rounded-xl text-[0.95rem] outline-none"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "var(--text-primary)",
							}}
						/>
					</div>

					<div className="flex flex-col gap-2.5">
						<span
							className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
							style={{ color: "var(--text-muted)" }}
						>
							Descrição / Dica (Opcional)
						</span>
						<textarea
							placeholder="Descrição ou dica de execução"
							value={newExerciseDesc}
							onChange={(e) => setNewExerciseDesc(e.target.value)}
							rows={3}
							className="w-full px-4 py-3 rounded-xl text-[0.95rem] outline-none resize-none"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.1)",
								color: "var(--text-primary)",
							}}
						/>
					</div>

					<button
						type="button"
						onClick={handleCreateNew}
						disabled={creating || !newExerciseName.trim()}
						className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
						style={{
							background: "var(--accent-color)",
							color: "#000",
							fontFamily: "Outfit",
							boxShadow: !newExerciseName.trim()
								? "none"
								: "0 4px 14px var(--accent-glow)",
						}}
					>
						{creating ? "Adicionando..." : "Adicionar Exercício"}
					</button>
				</div>
			</Modal>
		</div>
	);
}
