import { useState } from "react";
import { getPlansForUser } from "../../lib/queries/plans";
import type { Program, WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";
import { EditPlanModal } from "../WorkoutView/EditPlanModal";
import { PlanEditor } from "./PlanEditor";
import { PlanList } from "./PlanList";
import { ProgramList } from "./ProgramList";

interface Props {
	programs: Program[];
	activeProgramId: number | null;
	setActiveProgramId: (id: number) => void;
	plans: WorkoutPlan[];
	onChanged: (newProgramId?: number) => void;
	loading?: boolean;
}

type View = "programs" | "plans" | "editor";

function ProgramListSkeleton() {
	const items = [1, 2, 3];
	return (
		<div className="flex flex-col gap-3 animate-pulse">
			{items.map((id) => (
				<div
					key={id}
					className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border"
					style={{
						background: "rgba(255,255,255,0.03)",
						borderColor: "rgba(255,255,255,0.08)",
					}}
				>
					<div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 shrink-0" />
					<div className="flex-1 min-w-0 flex flex-col gap-2">
						<div className="h-4 bg-white/10 rounded w-1/3" />
						<div className="h-3 bg-white/5 rounded w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}

function PlanListSkeleton() {
	const items = [1, 2, 3, 4];
	return (
		<div className="flex flex-col gap-3 animate-pulse">
			{items.map((id) => (
				<div
					key={id}
					className="flex items-center rounded-2xl overflow-hidden border"
					style={{
						background: "rgba(255,255,255,0.03)",
						borderColor: "rgba(255,255,255,0.07)",
					}}
				>
					<div
						className="flex flex-col items-center justify-center w-14 py-4 shrink-0"
						style={{
							background: "rgba(255,255,255,0.02)",
							borderRight: "1px solid rgba(255,255,255,0.07)",
						}}
					>
						<div className="h-2.5 bg-white/10 rounded w-6 mb-1.5" />
						<div className="h-4 bg-white/10 rounded w-5" />
					</div>
					<div className="flex-1 py-3 pl-3 flex flex-col gap-2">
						<div className="h-4 bg-white/10 rounded w-1/2" />
						<div className="h-3 bg-white/5 rounded w-1/4" />
					</div>
				</div>
			))}
		</div>
	);
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.82rem] font-bold cursor-pointer transition-all active:scale-[0.97] shrink-0"
			style={{
				background: "var(--accent-color)",
				color: "#000",
				fontFamily: "Outfit",
			}}
		>
			<svg
				aria-hidden="true"
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			{label}
		</button>
	);
}

export function ManageScreen({
	programs,
	activeProgramId,
	setActiveProgramId,
	plans: initialPlans,
	onChanged,
	loading,
}: Props) {
	const [plans, setPlans] = useState<WorkoutPlan[]>(initialPlans);
	const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
	const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
	const [addTrigger, setAddTrigger] = useState(0);
	const [showEditPlanModal, setShowEditPlanModal] = useState(false);

	const view: View = selectedPlan && selectedPlan.extra !== "descanso"
		? "editor"
		: selectedProgram
			? "plans"
			: "programs";

	const [prevSelectedPlan, setPrevSelectedPlan] = useState(selectedPlan);
	if (selectedPlan !== prevSelectedPlan) {
		setPrevSelectedPlan(selectedPlan);
		if (selectedPlan && selectedPlan.extra === "descanso") {
			setShowEditPlanModal(true);
		}
	}

	async function handleChanged(newProgramId?: number) {
		const updated = await getPlansForUser();
		setPlans(updated);
		if (selectedPlan) {
			const found = updated.find((p) => p.id === selectedPlan.id);
			if (found) setSelectedPlan(found);
		}
		onChanged(newProgramId);
	}

	function handleBack() {
		if (view === "editor") {
			setSelectedPlan(null);
		} else if (view === "plans") {
			setSelectedProgram(null);
		}
	}

	const headerTitle =
		view === "editor"
			? (selectedPlan?.name ?? "Treino")
			: view === "plans"
				? (selectedProgram?.name ?? "Treinos")
				: "Treinos";

	return (
		<div className="flex flex-col flex-1">
			{/* Unified header */}
			<header className="flex items-center gap-3 px-5 pt-[calc(1.5rem+var(--safe-top))] pb-4">
				{view !== "programs" && (
					<button
						type="button"
						onClick={handleBack}
						className="p-2 -ml-2 rounded-xl cursor-pointer transition-all active:opacity-60 shrink-0"
						style={{ color: "var(--text-secondary)" }}
						aria-label="Voltar"
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
					</button>
				)}

				<div className="flex flex-col min-w-0 flex-1">
					{view === "programs" && (
						<span
							className="text-[0.7rem] uppercase tracking-[0.2rem] font-bold"
							style={{ color: "var(--accent-color)" }}
						>
							Gerenciar
						</span>
					)}
					{view === "plans" && selectedProgram && (
						<span
							className="text-[0.72rem] uppercase tracking-[0.1rem] font-bold truncate"
							style={{ color: "var(--text-muted)" }}
						>
							Treinos
						</span>
					)}
					{view === "editor" && selectedPlan && (
						<span
							className="text-[0.72rem] uppercase tracking-[0.1rem] font-bold truncate"
							style={{ color: "var(--accent-color)" }}
						>
							Treino · {DAY_LABELS[selectedPlan.suggestedDay]}
						</span>
					)}
					<h2
						className="text-[1.75rem] font-bold tracking-[-0.02em] leading-tight truncate"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						{headerTitle}
					</h2>
				</div>

				{view !== "editor" ? (
					<AddButton
						label={view === "plans" ? "Novo treino" : "Novo programa"}
						onClick={() => setAddTrigger((n) => n + 1)}
					/>
				) : (
					<button
						type="button"
						onClick={() => setShowEditPlanModal(true)}
						className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.82rem] font-bold cursor-pointer transition-all active:scale-[0.97] shrink-0"
						style={{
							background: "rgba(255,255,255,0.05)",
							border: "1px solid var(--card-border)",
							color: "var(--text-secondary)",
							fontFamily: "Outfit",
						}}
					>
						<svg
							aria-hidden="true"
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
						</svg>
						Editar
					</button>
				)}
			</header>

			{/* Animated content — key causes remount + fade-in on view change */}
			<div
				key={view}
				className="flex flex-col gap-4 px-5 pb-4 animate-fade-in"
			>
				{loading ? (
					view === "plans" ? (
						<PlanListSkeleton />
					) : (
						<ProgramListSkeleton />
					)
				) : view === "editor" && selectedPlan ? (
					<PlanEditor plan={selectedPlan} onChanged={handleChanged} />
				) : view === "plans" && selectedProgram ? (
					<PlanList
						programId={selectedProgram.id}
						plans={plans.filter((p) => p.programId === selectedProgram.id)}
						addTrigger={addTrigger}
						onSelectPlan={setSelectedPlan}
						onChanged={handleChanged}
					/>
				) : (
					<ProgramList
						programs={programs}
						activeProgramId={activeProgramId}
						onSetActiveProgram={setActiveProgramId}
						onSelectProgram={setSelectedProgram}
						addTrigger={addTrigger}
						onChanged={handleChanged}
					/>
				)}
			</div>

			{showEditPlanModal && selectedPlan && (
				<EditPlanModal
					isOpen={showEditPlanModal}
					plan={selectedPlan}
					existingDays={plans
						.filter(
							(p) =>
								p.programId === selectedPlan.programId &&
								p.id !== selectedPlan.id,
						)
						.map((p) => p.suggestedDay)}
					onClose={() => {
						setShowEditPlanModal(false);
						if (selectedPlan.extra === "descanso") {
							setSelectedPlan(null);
						}
					}}
					onChanged={handleChanged}
				/>
			)}
		</div>
	);
}
