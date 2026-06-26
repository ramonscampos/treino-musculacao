import { useEffect, useRef, useState } from "react";
import {
	deleteExercise,
	type Exercise,
	getUserExercises,
	updateExercise,
} from "../../lib/queries/manage";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Modal } from "../ui/Modal";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onChanged?: () => void;
}

export function ManageExercisesModal({ isOpen, onClose, onChanged }: Props) {
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [loading, setLoading] = useState(true);
	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	if (isOpen !== prevIsOpen) {
		setPrevIsOpen(isOpen);
		if (isOpen) {
			setLoading(true);
		}
	}
	const [searchQuery, setSearchQuery] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editName, setEditName] = useState("");
	const editInputRef = useRef<HTMLInputElement>(null);

	// Focus the input when editing starts
	useEffect(() => {
		if (editingId !== null) {
			editInputRef.current?.focus();
		}
	}, [editingId]);

	// States for confirmation modals
	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
	const [confirmEditData, setConfirmEditData] = useState<{
		id: number;
		name: string;
	} | null>(null);

	async function loadExercises() {
		try {
			const data = await getUserExercises();
			setExercises(data);
		} catch (err) {
			console.error("Erro ao carregar exercícios:", err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (isOpen) {
			getUserExercises()
				.then(setExercises)
				.catch((err) => console.error("Erro ao carregar exercícios:", err))
				.finally(() => setLoading(false));
		}
	}, [isOpen]);

	async function handleEdit(exercise: Exercise) {
		setEditingId(exercise.id);
		setEditName(exercise.name);
	}

	async function triggerSaveEdit(id: number) {
		const name = editName.trim();
		if (!name) return;
		setConfirmEditData({ id, name });
	}

	async function handleSaveEdit() {
		if (!confirmEditData) return;
		const { id, name } = confirmEditData;

		try {
			await updateExercise(id, name);
			setEditingId(null);
			setEditName("");
			setConfirmEditData(null);
			setLoading(true);
			await loadExercises();
			if (onChanged) onChanged();
		} catch (err) {
			console.error("Erro ao atualizar exercício:", err);
			alert("Erro ao salvar alterações.");
		}
	}

	async function triggerDelete(id: number) {
		setConfirmDeleteId(id);
	}

	async function handleDelete() {
		if (!confirmDeleteId) return;

		try {
			await deleteExercise(confirmDeleteId);
			setConfirmDeleteId(null);
			setLoading(true);
			await loadExercises();
			if (onChanged) onChanged();
		} catch (err) {
			console.error("Erro ao deletar exercício:", err);
			alert("Erro ao excluir exercício.");
		}
	}

	const filteredExercises = exercises.filter((ex) =>
		ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<>
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				variant="fullscreen"
				title="Gerenciar Exercícios"
			>
				<div className="flex flex-col gap-4 h-full max-h-[70vh]">
					{/* Barra de Pesquisa */}
					<div className="relative">
						<input
							type="text"
							placeholder="Buscar exercício..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full py-[0.7rem] pl-10 pr-4 rounded-xl focus:outline-none transition-all text-[0.9rem] border font-medium"
							style={{
								background: "rgba(255,255,255,0.03)",
								borderColor: "var(--card-border)",
								color: "var(--text-primary)",
							}}
						/>
						<div className="absolute left-3.5 top-3.5 opacity-40">
							<svg
								aria-hidden={true}
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
						</div>
					</div>

					{/* Lista de Exercícios */}
					<div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1">
						{loading ? (
							<div className="text-center py-8 text-[0.85rem] opacity-60">
								Carregando exercícios...
							</div>
						) : filteredExercises.length === 0 ? (
							<div className="text-center py-8 text-[0.85rem] opacity-60">
								Nenhum exercício encontrado.
							</div>
						) : (
							filteredExercises.map((ex) => {
								const isEditing = editingId === ex.id;
								return (
									<div
										key={ex.id}
										className="flex items-center justify-between p-3.5 rounded-2xl border transition-all min-h-[4.25rem]"
										style={{
											background: "var(--card-bg)",
											borderColor: "var(--card-border)",
										}}
									>
										{isEditing ? (
											<div className="flex items-center gap-2 w-full">
												<input
													ref={editInputRef}
													type="text"
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													className="flex-1 py-1.5 px-3 rounded-lg focus:outline-none transition-all text-[0.88rem] border font-semibold"
													style={{
														background: "rgba(0,0,0,0.2)",
														borderColor: "var(--accent-mute)",
														color: "var(--text-primary)",
													}}
												/>
												<button
													type="button"
													onClick={() => triggerSaveEdit(ex.id)}
													className="px-3 py-1.5 rounded-lg text-[0.75rem] font-bold cursor-pointer transition-all active:scale-95 shrink-0"
													style={{
														background: "var(--accent-color)",
														color: "#000",
													}}
												>
													Salvar
												</button>
												<button
													type="button"
													onClick={() => setEditingId(null)}
													className="px-3 py-1.5 rounded-lg text-[0.75rem] font-bold cursor-pointer transition-all active:scale-95 shrink-0"
													style={{
														background: "rgba(255,255,255,0.05)",
														border: "1px solid var(--card-border)",
														color: "var(--text-secondary)",
													}}
												>
													Cancelar
												</button>
											</div>
										) : (
											<>
												<div className="flex flex-col gap-0.5 min-w-0 pr-4">
													<span
														className="text-[0.92rem] font-bold truncate"
														style={{
															color: "var(--text-primary)",
															fontFamily: "Outfit",
														}}
													>
														{ex.name}
													</span>
													{ex.description && (
														<span
															className="text-[0.72rem] truncate"
															style={{ color: "var(--text-secondary)" }}
														>
															{ex.description}
														</span>
													)}
												</div>
												<div className="flex items-center gap-1.5 shrink-0">
													<button
														type="button"
														onClick={() => handleEdit(ex)}
														className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 cursor-pointer"
														style={{
															background: "rgba(255,255,255,0.03)",
															border: "1px solid var(--card-border)",
															color: "var(--text-secondary)",
														}}
														aria-label="Editar"
													>
														<svg
															aria-hidden={true}
															width="14"
															height="14"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
															<path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
														</svg>
													</button>
													<button
														type="button"
														onClick={() => triggerDelete(ex.id)}
														className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 cursor-pointer"
														style={{
															background: "rgba(255, 78, 78, 0.05)",
															border: "1px solid rgba(255, 78, 78, 0.15)",
															color: "rgba(255, 100, 100, 0.9)",
														}}
														aria-label="Excluir"
													>
														<svg
															aria-hidden={true}
															width="14"
															height="14"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<polyline points="3 6 5 6 21 6" />
															<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
														</svg>
													</button>
												</div>
											</>
										)}
									</div>
								);
							})
						)}
					</div>
				</div>
			</Modal>

			{/* Modal de Confirmação para Edição */}
			<ConfirmModal
				isOpen={confirmEditData !== null}
				title="Alterar Exercício"
				description="Deseja mesmo alterar o nome deste exercício? Esta alteração será refletida em todos os treinos em que ele é utilizado."
				confirmText="Salvar"
				cancelText="Cancelar"
				variant="warning"
				onConfirm={handleSaveEdit}
				onCancel={() => setConfirmEditData(null)}
			/>

			{/* Modal de Confirmação para Exclusão */}
			<ConfirmModal
				isOpen={confirmDeleteId !== null}
				title="Excluir Exercício"
				description="Deseja mesmo excluir este exercício? Ele será removido automaticamente de todos os treinos em que está presente."
				confirmText="Excluir"
				cancelText="Cancelar"
				variant="danger"
				onConfirm={handleDelete}
				onCancel={() => setConfirmDeleteId(null)}
			/>
		</>
	);
}
