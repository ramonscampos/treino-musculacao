import { useEffect, useRef, useState } from "react";
import { createProgram, updateProgram } from "../../lib/queries/manage";
import type { Program } from "../../types";
import { Modal } from "../ui/Modal";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onChanged: (newProgramId?: number) => void;
	program?: Program | null;
}

export function ProgramModal({ isOpen, onClose, onChanged, program }: Props) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [restDays, setRestDays] = useState<number>(0);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	const [prevProgramId, setPrevProgramId] = useState(program?.id);
	if (isOpen !== prevIsOpen || program?.id !== prevProgramId) {
		setPrevIsOpen(isOpen);
		setPrevProgramId(program?.id);
		if (isOpen) {
			setName(program?.name ?? "");
			setDescription(program?.description ?? "");
			setRestDays(program?.restDays ?? 0);
		} else {
			setName("");
			setDescription("");
			setRestDays(0);
		}
	}

	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 320); // wait for slide-up animation
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	async function handleSubmit() {
		if (!name.trim()) return;
		setSaving(true);
		try {
			if (program) {
				await updateProgram(program.id, {
					name: name.trim(),
					description: description.trim() || undefined,
					restDays,
				});
				onChanged();
			} else {
				const newProg = await createProgram(
					name.trim(),
					description.trim() || undefined,
					restDays,
				);
				onChanged(newProg.id);
			}
			onClose();
		} catch (err) {
			console.error("Erro ao salvar programa:", err);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			variant="sheet"
			title={program ? "Editar Programa" : "Criar Programa de Treino"}
		>
			<div className="flex flex-col gap-5">
				<div className="flex flex-col gap-2">
					<label
						htmlFor="program-name"
						className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
						style={{ color: "var(--text-muted)" }}
					>
						Nome do Programa
					</label>
					<input
						id="program-name"
						ref={inputRef}
						type="text"
						placeholder="ex: Treino de Hipertrofia, Emagrecimento..."
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
						className="w-full py-[0.75rem] px-4 rounded-2xl focus:outline-none transition-all text-[0.95rem] font-semibold border"
						style={{
							background: "rgba(255,255,255,0.05)",
							borderColor: "var(--card-border)",
							color: "var(--text-primary)",
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = "var(--accent-color)";
							e.currentTarget.style.background = "var(--accent-soft)";
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = "var(--card-border)";
							e.currentTarget.style.background = "rgba(255,255,255,0.05)";
						}}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label
						htmlFor="program-desc"
						className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
						style={{ color: "var(--text-muted)" }}
					>
						Descrição (Opcional)
					</label>
					<input
						id="program-desc"
						type="text"
						placeholder="ex: Foco em ganho de massa, 4x por semana"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
						className="w-full py-[0.75rem] px-4 rounded-2xl focus:outline-none transition-all text-[0.95rem] font-semibold border"
						style={{
							background: "rgba(255,255,255,0.05)",
							borderColor: "var(--card-border)",
							color: "var(--text-primary)",
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = "var(--accent-color)";
							e.currentTarget.style.background = "var(--accent-soft)";
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = "var(--card-border)";
							e.currentTarget.style.background = "rgba(255,255,255,0.05)";
						}}
					/>
				</div>

				<div className="flex flex-col gap-2.5">
					<span
						className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
						style={{ color: "var(--text-muted)" }}
					>
						Dias de Descanso
					</span>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setRestDays((prev) => Math.max(0, prev - 1))}
							className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold transition-all active:scale-90 cursor-pointer"
							style={{
								borderColor: "var(--card-border)",
								background: "rgba(255,255,255,0.02)",
								color: "var(--text-primary)",
							}}
						>
							-
						</button>
						<span
							className="text-[1.1rem] font-bold w-6 text-center"
							style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
						>
							{restDays}
						</span>
						<button
							type="button"
							onClick={() => setRestDays((prev) => Math.min(6, prev + 1))}
							className="w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold transition-all active:scale-90 cursor-pointer"
							style={{
								borderColor: "var(--card-border)",
								background: "rgba(255,255,255,0.02)",
								color: "var(--text-primary)",
							}}
						>
							+
						</button>
						<span
							className="text-[0.8rem]"
							style={{ color: "var(--text-secondary)" }}
						>
							{restDays === 1
								? "dia de descanso por semana"
								: "dias de descanso por semana"}
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={handleSubmit}
					disabled={saving || !name.trim()}
					className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
					style={{
						background: "var(--accent-color)",
						color: "#000",
						fontFamily: "Outfit",
						boxShadow: !name.trim() ? "none" : "0 4px 14px var(--accent-glow)",
					}}
				>
					{saving
						? "Salvando..."
						: program
							? "Salvar Alterações"
							: "Criar Programa"}
				</button>
			</div>
		</Modal>
	);
}
