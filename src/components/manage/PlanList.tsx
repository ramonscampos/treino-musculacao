import { useState } from "react";
import {
	createPlan,
	deletePlan,
} from "../../lib/queries/manage";
import type { DayKey, WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";

interface Props {
	plans: WorkoutPlan[];
	onSelectPlan: (plan: WorkoutPlan) => void;
	onChanged: () => void;
}

const DAYS: DayKey[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

export function PlanList({ plans, onSelectPlan, onChanged }: Props) {
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDay, setNewDay] = useState<DayKey>("SEG");

	async function handleCreate() {
		if (!newName.trim()) return;
		await createPlan(newName.trim(), newDay, plans.length);
		setNewName("");
		setCreating(false);
		onChanged();
	}

	async function handleDelete(plan: WorkoutPlan) {
		if (!confirm(`Excluir "${plan.name}"? Isso remove todos os exercícios do plano.`)) return;
		await deletePlan(plan.id);
		onChanged();
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-[1rem] font-bold" style={{ color: "var(--text-primary)" }}>
					Meus Treinos
				</h2>
				{!creating && (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.82rem] font-semibold cursor-pointer transition-all active:opacity-70"
						style={{ background: "var(--accent-color)", color: "#000" }}
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
							<path d="M12 5v14M5 12h14" />
						</svg>
						Novo treino
					</button>
				)}
			</div>

			{creating && (
				<div
					className="flex flex-col gap-3 p-3 rounded-2xl"
					style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
				>
					<input
						autoFocus
						type="text"
						placeholder="Nome do treino (ex: Peito + Tríceps)"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
						className="px-3 py-2 rounded-xl text-[0.9rem] outline-none w-full"
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
								onClick={() => setNewDay(d)}
								className="px-3 py-1 rounded-lg text-[0.8rem] font-medium cursor-pointer"
								style={{
									background: newDay === d ? "var(--accent-color)" : "rgba(255,255,255,0.05)",
									color: newDay === d ? "#000" : "var(--text-secondary)",
								}}
							>
								{DAY_LABELS[d]}
							</button>
						))}
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={handleCreate}
							className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
							style={{ background: "var(--accent-color)", color: "#000" }}>
							Criar
						</button>
						<button type="button" onClick={() => setCreating(false)}
							className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
							style={{ color: "var(--text-secondary)" }}>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{plans.length === 0 && !creating && (
				<p className="text-center py-8 text-[0.9rem]" style={{ color: "var(--text-secondary)" }}>
					Nenhum treino criado ainda.
				</p>
			)}

			{plans.map((plan) => (
				<div
					key={plan.id}
					className="flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition-all active:opacity-70"
					style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
					onClick={() => onSelectPlan(plan)}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => e.key === "Enter" && onSelectPlan(plan)}
				>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="text-[0.9rem] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
							{plan.name}
						</span>
						<span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
							{DAY_LABELS[plan.suggestedDay]}
						</span>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); handleDelete(plan); }}
							className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
							style={{ color: "rgba(255,80,80,0.6)" }}
							aria-label="Excluir treino"
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
								<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
							</svg>
						</button>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-secondary)" }}>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</div>
				</div>
			))}
		</div>
	);
}
