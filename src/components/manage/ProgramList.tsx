import { useState } from "react";
import { deleteProgram } from "../../lib/queries/manage";
import type { Program } from "../../types";
import { ConfirmModal } from "../ui/ConfirmModal";
import { ProgramModal } from "./ProgramModal";

interface Props {
	programs: Program[];
	activeProgramId: number | null;
	addTrigger: number;
	onSetActiveProgram: (id: number) => void;
	onSelectProgram: (p: Program) => void;
	onChanged: (newProgramId?: number) => void;
}

export function ProgramList({
	programs,
	activeProgramId,
	addTrigger,
	onSetActiveProgram,
	onSelectProgram,
	onChanged,
}: Props) {
	const [creating, setCreating] = useState(false);
	const [editingProgram, setEditingProgram] = useState<Program | null>(null);
	const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);

	const [prevAddTrigger, setPrevAddTrigger] = useState(addTrigger);
	if (addTrigger !== prevAddTrigger) {
		setPrevAddTrigger(addTrigger);
		if (addTrigger > 0) {
			setCreating(true);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			{programs.length === 0 && !creating && (
				<div
					className="flex flex-col items-center justify-center p-8 rounded-2xl border text-center gap-4 mt-2"
					style={{
						background: "var(--card-bg)",
						borderColor: "var(--card-border)",
						backdropFilter: "blur(6px)",
					}}
				>
					<div
						className="w-12 h-12 rounded-xl flex items-center justify-center text-[1.5rem]"
						style={{
							background: "var(--accent-soft)",
							border: "1px dashed var(--accent-mute)",
							color: "var(--accent-color)",
						}}
					>
						📁
					</div>
					<div className="flex flex-col gap-1 max-w-xs">
						<span
							className="text-[0.95rem] font-bold"
							style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
						>
							Nenhum programa cadastrado
						</span>
						<span
							className="text-[0.78rem]"
							style={{ color: "var(--text-secondary)" }}
						>
							Toque no botão "+ Novo programa" para criar o seu primeiro plano
							de treinos.
						</span>
					</div>
				</div>
			)}

			{programs.map((p) => {
				const isActive = p.id === activeProgramId;
				return (
					// biome-ignore lint/a11y/useSemanticElements: nested interactive buttons require a generic container
					<div
						key={p.id}
						className="relative overflow-hidden rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
						style={{
							background: isActive
								? "rgba(255,255,255,0.06)"
								: "rgba(255,255,255,0.03)",
							border: isActive
								? "1px solid var(--accent-color)"
								: "1px solid rgba(255,255,255,0.08)",
							boxShadow: isActive
								? "0 0 0 1px var(--accent-mute), inset 0 0 24px var(--accent-soft)"
								: "none",
						}}
						onClick={() => onSelectProgram(p)}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => e.key === "Enter" && onSelectProgram(p)}
					>
						{/* Accent left bar */}
						{isActive && (
							<div
								className="absolute left-0 top-0 bottom-0 w-[3px]"
								style={{ background: "var(--accent-color)" }}
							/>
						)}

						<div
							className="flex items-center gap-3 px-4 py-3.5"
							style={{ paddingLeft: isActive ? "1.25rem" : "1rem" }}
						>
							{/* Icon */}
							<div
								className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[1rem]"
								style={{
									background: isActive
										? "var(--accent-soft)"
										: "rgba(255,255,255,0.05)",
									border: isActive
										? "1px solid var(--accent-mute)"
										: "1px solid rgba(255,255,255,0.08)",
								}}
							>
								{isActive ? (
									<svg
										aria-hidden="true"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
										style={{ color: "var(--accent-color)" }}
									>
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
										<path d="m9 11 3 3L22 4" />
									</svg>
								) : (
									<svg
										aria-hidden="true"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										style={{ color: "var(--text-muted)" }}
									>
										<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
									</svg>
								)}
							</div>

							{/* Text */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span
										className="text-[0.95rem] font-bold truncate"
										style={{
											color: "var(--text-primary)",
											fontFamily: "Outfit",
										}}
									>
										{p.name}
									</span>
									{isActive && (
										<span
											className="text-[0.6rem] font-bold uppercase tracking-[0.07rem] px-1.5 py-0.5 rounded-md shrink-0"
											style={{
												background: "var(--accent-color)",
												color: "#000",
											}}
										>
											Ativo
										</span>
									)}
								</div>
								{p.description && (
									<span
										className="text-[0.78rem] truncate block"
										style={{ color: "var(--text-secondary)" }}
									>
										{p.description}
									</span>
								)}
								{p.restDays > 0 && (
									<span
										className="text-[0.72rem]"
										style={{ color: "var(--text-muted)" }}
									>
										{p.restDays} dia{p.restDays !== 1 ? "s" : ""} de descanso
									</span>
								)}
							</div>

							{/* Actions */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper */}
							<div
								className="flex items-center gap-0.5 shrink-0"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							>
								{!isActive && (
									<button
										type="button"
										onClick={() => onSetActiveProgram(p.id)}
										className="px-2.5 py-1.5 rounded-lg text-[0.72rem] font-semibold cursor-pointer transition-all active:scale-[0.95] shrink-0 mr-1"
										style={{
											background: "rgba(255,255,255,0.06)",
											border: "1px solid rgba(255,255,255,0.1)",
											color: "var(--text-secondary)",
										}}
									>
										Ativar
									</button>
								)}

								<button
									type="button"
									onClick={() => setEditingProgram(p)}
									className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
									style={{ color: "var(--text-muted)" }}
									aria-label="Editar programa"
									title="Editar programa"
								>
									<svg
										aria-hidden="true"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
									</svg>
								</button>

								<button
									type="button"
									onClick={() => setDeletingProgram(p)}
									className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
									style={{ color: "rgba(255,80,80,0.5)" }}
									aria-label="Excluir programa"
									title="Excluir programa"
								>
									<svg
										aria-hidden="true"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
									>
										<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
									</svg>
								</button>

								<svg
									aria-hidden="true"
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									style={{ color: "var(--text-muted)", marginLeft: "2px" }}
								>
									<path d="m9 18 6-6-6-6" />
								</svg>
							</div>
						</div>
					</div>
				);
			})}

			<ProgramModal
				isOpen={creating || editingProgram !== null}
				onClose={() => {
					setCreating(false);
					setEditingProgram(null);
				}}
				onChanged={onChanged}
				program={editingProgram}
			/>

			<ConfirmModal
				isOpen={deletingProgram !== null}
				title="Excluir Programa?"
				description={`Tem certeza que deseja excluir o programa "${deletingProgram?.name}"? Isso removerá permanentemente todos os treinos e exercícios vinculados a ele.`}
				onConfirm={async () => {
					if (!deletingProgram) return;
					await deleteProgram(deletingProgram.id);
					setDeletingProgram(null);
					onChanged();
				}}
				onCancel={() => setDeletingProgram(null)}
			/>
		</div>
	);
}
