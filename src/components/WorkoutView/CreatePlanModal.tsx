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
	const [isRestDay, setIsRestDay] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	if (isOpen !== prevIsOpen) {
		setPrevIsOpen(isOpen);
		if (!isOpen) {
			setNewName("");
			setNewDay("NONE");
			setIsRestDay(false);
		}
	}

	useEffect(() => {
		if (isOpen) {
			if (!isRestDay) {
				const timer = setTimeout(() => {
					inputRef.current?.focus();
				}, 320); // wait for slide-up animation
				return () => clearTimeout(timer);
			}
		}
	}, [isOpen, isRestDay]);

	async function handleCreate() {
		const targetName = isRestDay ? "Descanso" : newName.trim();
		if (!targetName) return;
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
			await createPlan(
				targetProgramId,
				targetName,
				newDay,
				plansLength,
				isRestDay ? "descanso" : undefined,
			);
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
						placeholder={isRestDay ? "Descanso" : "ex: Peito + Tríceps, Costas, Inferiores..."}
						value={isRestDay ? "Descanso" : newName}
						disabled={isRestDay}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
						className="w-full py-[0.75rem] px-4 rounded-2xl focus:outline-none transition-all text-[0.95rem] font-semibold border disabled:opacity-50 disabled:cursor-not-allowed"
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

				{/* Rest Day Toggle */}
				<div
					className="flex items-center gap-3 p-3.5 rounded-2xl border"
					style={{
						background: "rgba(255,255,255,0.02)",
						borderColor: "var(--card-border)",
					}}
				>
					<div className="flex-1 min-w-0">
						<div
							className="text-[0.88rem] font-bold"
							style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
						>
							Dia de Descanso
						</div>
						<div
							className="text-[0.72rem] leading-snug mt-0.5"
							style={{ color: "var(--text-secondary)" }}
						>
							Marcar este dia como descanso oficial sem exercícios.
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							const next = !isRestDay;
							setIsRestDay(next);
							if (next) {
								setNewName("Descanso");
								if (newDay === "NONE") {
									const availableDay = DAYS.find(
										(d) => d !== "NONE" && !existingDays.includes(d),
									);
									if (availableDay) {
										setNewDay(availableDay);
									}
								}
							} else if (newName === "Descanso") {
								setNewName("");
							}
						}}
						className="relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0"
						style={{
							background: isRestDay
								? "var(--accent-color)"
								: "rgba(255,255,255,0.15)",
						}}
						aria-label="Toggle dia de descanso"
					>
						<span
							className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
							style={{
								background: isRestDay ? "#000" : "#fff",
								transform: isRestDay ? "translateX(20px)" : "translateX(0)",
							}}
						/>
					</button>
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
							const isDisabled = isOccupied || (isRestDay && d === "NONE");
							return (
								<button
									key={d}
									type="button"
									disabled={isDisabled}
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
						(!isRestDay && !newName.trim()) ||
						(newDay !== "NONE" && existingDays.includes(newDay)) ||
						(isRestDay && newDay === "NONE")
					}
					className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
					style={{
						background: "var(--accent-color)",
						color: "#000",
						fontFamily: "Outfit",
						boxShadow: !isRestDay && !newName.trim()
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
