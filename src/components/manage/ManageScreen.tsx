import { useState } from "react";
import { getPlansForUser } from "../../lib/queries/plans";
import type { WorkoutPlan } from "../../types";
import { PlanEditor } from "./PlanEditor";
import { PlanList } from "./PlanList";

interface Props {
	plans: WorkoutPlan[];
	onClose: () => void;
	onChanged: () => void;
}

export function ManageScreen({ plans: initialPlans, onClose, onChanged }: Props) {
	const [plans, setPlans] = useState<WorkoutPlan[]>(initialPlans);
	const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

	async function handleChanged() {
		const updated = await getPlansForUser();
		setPlans(updated);
		onChanged();
	}

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col"
			style={{ background: "var(--bg-color)" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 sm:px-6 pt-[calc(1.2rem+var(--safe-top))] pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
				<span className="text-[1rem] font-bold" style={{ color: "var(--text-primary)" }}>
					Gerenciar
				</span>
				<button
					type="button"
					onClick={onClose}
					className="p-2 rounded-xl cursor-pointer transition-all active:opacity-60"
					style={{ color: "var(--text-secondary)" }}
					aria-label="Fechar"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 mx-auto w-full max-w-150">
				{selectedPlan ? (
					<PlanEditor
						plan={selectedPlan}
						onBack={() => setSelectedPlan(null)}
						onChanged={handleChanged}
					/>
				) : (
					<PlanList
						plans={plans}
						onSelectPlan={setSelectedPlan}
						onChanged={handleChanged}
					/>
				)}
			</div>
		</div>
	);
}
