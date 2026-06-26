import { useEffect, useRef, useState } from "react";
import { updatePlan } from "../../lib/queries/manage";
import { DAY_LABELS, type DayKey } from "../../types";
import { Modal } from "../ui/Modal";

interface Props {
	isOpen: boolean;
	plan: {
		id: number;
		name: string;
		suggestedDay: DayKey;
		extra?: string;
	};
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

export function EditPlanModal({
	isOpen,
	plan,
	existingDays = [],
	onClose,
	onChanged,
}: Props) {
	const [name, setName] = useState(plan.name);
	const [day, setDay] = useState<DayKey>(plan.suggestedDay);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isRestDay, setIsRestDay] = useState(plan.extra === "descanso");
	const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
	const [prevPlanId, setPrevPlanId] = useState(plan.id);
	if (isOpen !== prevIsOpen || plan.id !== prevPlanId) {
		setPrevIsOpen(isOpen);
		setPrevPlanId(plan.id);
		if (isOpen) {
			setName(plan.name);
			setDay(plan.suggestedDay);
			setIsRestDay(plan.extra === "descanso");
		} else {
			setName("");
			setDay("NONE");
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

	async function handleSave() {
		const targetName = isRestDay ? "Descanso" : name.trim();
		if (!targetName) return;
		setSaving(true);
		try {
			await updatePlan(plan.id, {
				name: targetName,
				suggestedDay: day,
				extra: isRestDay ? "descanso" : null,
			});
			onChanged();
			onClose();
		} catch (err) {
			console.error("Erro ao salvar treino:", err);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			variant="sheet"
			title="Editar Plano de Treino"
		>
			<div className="flex flex-col gap-5">
				<div className="flex flex-col gap-2">
					<label
						htmlFor="edit-plan-name"
						className="text-[0.75rem] font-bold uppercase tracking-[0.08rem]"
						style={{ color: "var(--text-muted)" }}
					>
						Nome do Treino
					</label>
					<input
						id="edit-plan-name"
						ref={inputRef}
						type="text"
						placeholder={
							isRestDay
								? "Descanso"
								: "ex: Peito + Tríceps, Costas, Inferiores..."
						}
						value={isRestDay ? "Descanso" : name}
						disabled={isRestDay}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSave()}
						className="w-full py-3 px-4 rounded-2xl focus:outline-none transition-all text-[0.95rem] font-semibold border disabled:opacity-50 disabled:cursor-not-allowed"
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
							const isDisabled = isOccupied || (isRestDay && d === "NONE");
							return (
								<button
									key={d}
									type="button"
									disabled={isDisabled}
									onClick={() => setDay(d)}
									className="px-3.5 py-2 rounded-xl text-[0.8rem] font-bold cursor-pointer transition-all border active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
									style={{
										background:
											day === d ? "var(--accent-soft)" : "transparent",
										borderColor:
											day === d ? "var(--accent-color)" : "var(--card-border)",
										color:
											day === d
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
					onClick={handleSave}
					disabled={
						saving ||
						(!isRestDay && !name.trim()) ||
						(day !== "NONE" && existingDays.includes(day)) ||
						(isRestDay && day === "NONE")
					}
					className="w-full py-[0.85rem] font-bold text-[1rem] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
					style={{
						background: "var(--accent-color)",
						color: "#000",
						fontFamily: "Outfit",
						boxShadow:
							!isRestDay && !name.trim()
								? "none"
								: "0 4px 14px var(--accent-glow)",
					}}
				>
					{saving ? "Salvando..." : "Salvar Alterações"}
				</button>
			</div>
		</Modal>
	);
}
