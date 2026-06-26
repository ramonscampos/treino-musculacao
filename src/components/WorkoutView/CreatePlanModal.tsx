import { useEffect, useRef, useState } from "react";
import {
	createPlan,
	createProgram,
	getUserPrograms,
} from "../../lib/queries/manage";
import { DAY_LABELS, type DayKey } from "../../types";
import { Modal } from "../ui/Modal";

interface Props {
	isOpen: boolean;
	programId?: number | null;
	plansLength: number;
	existingDays?: DayKey[];
	onClose: () => void;
	onChanged: () => void;
}

const DAYS: DayKey[] = [
	"SEG",
	"TER",
	"QUA",
	"QUI",
	"SEX",
	"SAB",
	"DOM",
	"NONE",
];

export function CreatePlanModal({
	isOpen,
	programId,
	plansLength,
	existingDays = [],
	onClose,
	onChanged,
}: Props) {
	const [newName, setNewName] = useState("");
	const [newDay, setNewDay] = useState<DayKey>("NONE");
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	if (isOpen !== prevIsOpen) {
		setPrevIsOpen(isOpen);
		if (!isOpen) {
			setNewName("");
			setNewDay("NONE");
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

	async function handleCreate() {
		if (!newName.trim()) return;
		setSaving(true);
		try {
			let targetProgramId = programId;
			if (!targetProgramId) {
				// User is creating a plan from the home screen fallback, program might not exist
				const programs = await getUserPrograms();
				if (programs.length === 0) {
					const defaultProg = await createProgram(
						"Meus Treinos",
						"Programa de treinos padrão",
					);
					targetProgramId = defaultProg.id;
				} else {
					targetProgramId = programs[0].id;
				}
			}
			await createPlan(targetProgramId, newName.trim(), newDay, plansLength);
			onChanged();
			onClose();
		} catch (err) {
			console.error("Erro ao criar plano de treino:", err);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			variant="sheet"
			title="Criar Plano de Treino"
		>
			<div className="flex flex-col gap-5">
				<div className="flex flex-col gap-2">
					<label
						htmlFor="plan-name"
						className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
						style={{ color: "var(--text-muted)" }}
					>
						Nome do Treino
					</label>
					<input
						id="plan-name"
						ref={inputRef}
						type="text"
						placeholder="ex: Peito + Tríceps, Costas, Inferiores..."
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
						Dia Sugerido
					</span>
					<div className="flex gap-2 flex-wrap">
						{DAYS.map((d) => {
							const isOccupied = d !== "NONE" && existingDays.includes(d);
							return (
								<button
									key={d}
									type="button"
									disabled={isOccupied}
									onClick={() => setNewDay(d)}
									className="px-3.5 py-2 rounded-xl text-[0.8rem] font-bold cursor-pointer transition-all border active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
									style={{
										background:
											newDay === d ? "var(--accent-soft)" : "transparent",
										borderColor:
											newDay === d
												? "var(--accent-color)"
												: "var(--card-border)",
										color:
											newDay === d
												? "var(--accent-color)"
												: "var(--text-secondary)",
									}}
								>
									{DAY_LABELS[d]}
								</button>
							);
						})}
					</div>
				</div>

				<button
					type="button"
					onClick={handleCreate}
					disabled={
						saving ||
						!newName.trim() ||
						(newDay !== "NONE" && existingDays.includes(newDay))
					}
					className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
					style={{
						background: "var(--accent-color)",
						color: "#000",
						fontFamily: "Outfit",
						boxShadow: !newName.trim()
							? "none"
							: "0 4px 14px var(--accent-glow)",
					}}
				>
					{saving ? "Criando..." : "Criar Treino"}
				</button>
			</div>
		</Modal>
	);
}
