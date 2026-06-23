import { useEffect, useRef, useState } from "react";
import { createExercise, getUserExercises, type Exercise } from "../../lib/queries/manage";

interface Props {
	onSelect: (exercise: Exercise) => void;
	onCancel: () => void;
}

export function ExercisePicker({ onSelect, onCancel }: Props) {
	const [query, setQuery] = useState("");
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [creating, setCreating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		getUserExercises().then(setExercises);
		setTimeout(() => inputRef.current?.focus(), 50);
	}, []);

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
				{showCreate && (
					<button
						type="button"
						onClick={handleCreate}
						disabled={creating}
						className="text-left px-4 py-3 rounded-xl text-[0.9rem] font-medium transition-all active:opacity-70 cursor-pointer"
						style={{
							background: "var(--accent-soft)",
							border: "1px dashed var(--accent-mute)",
							color: "var(--accent-color)",
						}}
					>
						{creating ? "Criando..." : `Criar "${query.trim()}"`}
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

				{filtered.length === 0 && !showCreate && (
					<p className="text-center py-4 text-[0.85rem]" style={{ color: "var(--text-secondary)" }}>
						Nenhum exercício encontrado.
					</p>
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
		</div>
	);
}
