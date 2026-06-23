import { useEffect, useState } from "react";
import { getPlansForUser } from "../../lib/queries/plans";
import type { Program, User, WorkoutPlan } from "../../types";
import { PlanEditor } from "./PlanEditor";
import { PlanList } from "./PlanList";
import { ProgramList } from "./ProgramList";

interface Props {
	user: User;
	updateThemeColor: (color: string) => Promise<void>;
	programs: Program[];
	plans: WorkoutPlan[];
	onClose: () => void;
	onChanged: () => void;
}

export function ManageScreen({
	user,
	updateThemeColor,
	programs,
	plans: initialPlans,
	onClose,
	onChanged,
}: Props) {
	const [plans, setPlans] = useState<WorkoutPlan[]>(initialPlans);
	const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
	const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setOpen(true), 0);
		return () => clearTimeout(timer);
	}, []);

	async function handleChanged() {
		const updated = await getPlansForUser();
		setPlans(updated);
		onChanged();
	}

	function handleClose() {
		setOpen(false);
		setTimeout(onClose, 420);
	}

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto mx-auto max-w-150 transition-transform duration-420"
			style={{
				background: "var(--bg-color)",
				transform: open ? "translateY(0)" : "translateY(100%)",
				transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<div className="max-w-150 mx-auto p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(2rem+var(--safe-bottom))]">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<h2
						className="text-[1.75rem] font-bold tracking-[-0.02em]"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						Gerenciar
					</h2>
					<button
						type="button"
						onClick={handleClose}
						className="w-11 h-11 flex items-center justify-center rounded-full transition-all active:bg-[rgba(255,255,255,0.1)]"
						style={{
							background: "var(--card-bg)",
							border: "1px solid var(--card-border)",
							color: "var(--text-primary)",
							fontSize: "1.1rem",
						}}
						aria-label="Fechar"
					>
						✕
					</button>
				</div>

				{/* Content */}
				{selectedPlan ? (
					<PlanEditor
						plan={selectedPlan}
						onBack={() => setSelectedPlan(null)}
						onChanged={handleChanged}
					/>
				) : selectedProgram ? (
					<PlanList
						programId={selectedProgram.id}
						plans={plans.filter((p) => p.programId === selectedProgram.id)}
						onBack={() => setSelectedProgram(null)}
						onSelectPlan={setSelectedPlan}
						onChanged={handleChanged}
					/>
				) : (
					<ProgramList
						user={user}
						updateThemeColor={updateThemeColor}
						programs={programs}
						onSelectProgram={setSelectedProgram}
						onChanged={handleChanged}
					/>
				)}
			</div>
		</div>
	);
}
