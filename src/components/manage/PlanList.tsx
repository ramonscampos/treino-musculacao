import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { useSortableList } from "../../hooks/useSortableList";
import { deletePlan, reorderPlans } from "../../lib/queries/manage";
import type { WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";
import { ConfirmModal } from "../ui/ConfirmModal";
import { CreatePlanModal } from "../WorkoutView/CreatePlanModal";

interface Props {
	programId: number;
	plans: WorkoutPlan[];
	addTrigger: number;
	onSelectPlan: (plan: WorkoutPlan) => void;
	onChanged: () => void;
}

// --- Grip icon ---
function GripHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			{...props}
			className="flex items-center justify-center px-1 self-stretch cursor-grab active:cursor-grabbing touch-none shrink-0"
			style={{ color: "var(--text-muted)" }}
			aria-label="Arrastar para reordenar"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<circle cx="9" cy="5" r="1.5" />
				<circle cx="15" cy="5" r="1.5" />
				<circle cx="9" cy="12" r="1.5" />
				<circle cx="15" cy="12" r="1.5" />
				<circle cx="9" cy="19" r="1.5" />
				<circle cx="15" cy="19" r="1.5" />
			</svg>
		</button>
	);
}

// --- Single sortable card ---
interface CardProps {
	plan: WorkoutPlan;
	index: number;
	isDragging?: boolean;
	onSelect: (plan: WorkoutPlan) => void;
	onDelete: (plan: WorkoutPlan) => void;
}

function PlanCard({ plan, index, isDragging, onSelect, onDelete }: CardProps) {
	const hasDay = plan.suggestedDay !== "NONE";
	return (
		<div
			className="group relative flex items-center rounded-2xl cursor-pointer transition-colors overflow-hidden"
			style={{
				background: isDragging
					? "rgba(255,255,255,0.07)"
					: "rgba(255,255,255,0.03)",
				border: isDragging
					? "1px solid var(--accent-mute)"
					: "1px solid rgba(255,255,255,0.07)",
				opacity: isDragging ? 0.5 : 1,
			}}
		>
			{/* Day strip */}
			<div
				className="flex flex-col items-center justify-center w-14 self-stretch shrink-0"
				style={{
					background: "var(--accent-soft)",
					borderRight: "1px solid var(--accent-mute)",
				}}
			>
				<span
					className="text-[0.55rem] font-bold uppercase tracking-widest"
					style={{ color: "var(--accent-color)", opacity: hasDay ? 0.7 : 0.3 }}
				>
					{hasDay ? plan.suggestedDay : "—"}
				</span>
				<span
					className="text-[1.15rem] font-black leading-none mt-0.5"
					style={{ color: "var(--accent-color)", fontFamily: "Outfit" }}
				>
					{String(index + 1).padStart(2, "0")}
				</span>
			</div>

			{/* Clickable content area */}
			{/* biome-ignore lint/a11y/useSemanticElements: interactive div inside sortable */}
			<div
				className="flex-1 min-w-0 py-3 pl-3"
				onClick={() => onSelect(plan)}
				onKeyDown={(e) => e.key === "Enter" && onSelect(plan)}
				role="button"
				tabIndex={0}
			>
				<div className="flex items-center gap-2">
					<span
						className="text-[0.92rem] font-semibold block truncate"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						{plan.name}
					</span>
					{plan.extra === "descanso" && (
						<span
							className="text-[0.62rem] font-bold uppercase tracking-[0.06rem] px-1.5 py-0.5 rounded-md"
							style={{
								background: "rgba(255, 170, 0, 0.12)",
								color: "#ffaa00",
								border: "1px solid rgba(255, 170, 0, 0.2)",
							}}
						>
							Descanso
						</span>
					)}
				</div>
				<span
					className="text-[0.75rem]"
					style={{ color: "var(--text-secondary)" }}
				>
					{DAY_LABELS[plan.suggestedDay]}
				</span>
			</div>

			{/* Actions */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper */}
			<div
				className="flex items-center gap-1 pr-2 shrink-0"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onDelete(plan);
					}}
					className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60 opacity-0 group-hover:opacity-100"
					style={{ color: "rgba(255,80,80,0.7)" }}
					aria-label="Excluir treino"
				>
					<svg
						aria-hidden="true"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
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
					style={{ color: "var(--text-muted)" }}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</div>
		</div>
	);
}

// --- Sortable wrapper ---
function SortablePlanCard(props: Omit<CardProps, "isDragging">) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: props.plan.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
			<GripHandle {...attributes} {...listeners} />
			<div className="flex-1 min-w-0">
				<PlanCard {...props} isDragging={isDragging} />
			</div>
		</div>
	);
}

// --- Main component ---
export function PlanList({
	programId,
	plans: initialPlans,
	addTrigger,
	onSelectPlan,
	onChanged,
}: Props) {
	const [creating, setCreating] = useState(false);
	const [deletingPlan, setDeletingPlan] = useState<WorkoutPlan | null>(null);
	const [activeId, setActiveId] = useState<number | null>(null);

	const {
		items: plans,
		handleDragEnd,
		syncItems,
	} = useSortableList(initialPlans, reorderPlans);

	// Sync when prop changes (after add/delete)
	useEffect(() => {
		syncItems(initialPlans);
	}, [initialPlans, syncItems]);

	const [prevAddTrigger, setPrevAddTrigger] = useState(addTrigger);
	if (addTrigger !== prevAddTrigger) {
		setPrevAddTrigger(addTrigger);
		if (addTrigger > 0) {
			setCreating(true);
		}
	}

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 150, tolerance: 8 },
		}),
	);

	function onDragStart(event: DragStartEvent) {
		setActiveId(event.active.id as number);
	}

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveId(null);
		if (over && active.id !== over.id) {
			handleDragEnd(active.id as number, over.id as number);
		}
	}

	const activePlan = activeId ? plans.find((p) => p.id === activeId) : null;
	const activeIndex = activePlan ? plans.indexOf(activePlan) : -1;

	return (
		<div className="flex flex-col gap-3">
			<CreatePlanModal
				isOpen={creating}
				onClose={() => setCreating(false)}
				programId={programId}
				plansLength={plans.length}
				existingDays={plans.map((p) => p.suggestedDay)}
				onChanged={onChanged}
			/>

			{plans.length === 0 && !creating && (
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
						🏋️
					</div>
					<div className="flex flex-col gap-1 max-w-xs">
						<span
							className="text-[0.95rem] font-bold"
							style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
						>
							Nenhum treino cadastrado
						</span>
						<span
							className="text-[0.78rem]"
							style={{ color: "var(--text-secondary)" }}
						>
							Toque no botão "+ Novo treino" para cadastrar os dias da sua
							divisão de treinos.
						</span>
					</div>
				</div>
			)}

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={plans.map((p) => p.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{plans.map((plan, index) => (
							<SortablePlanCard
								key={plan.id}
								plan={plan}
								index={index}
								onSelect={onSelectPlan}
								onDelete={setDeletingPlan}
							/>
						))}
					</div>
				</SortableContext>

				<DragOverlay>
					{activePlan ? (
						<div className="flex items-stretch gap-1 opacity-95 shadow-2xl">
							<GripHandle />
							<div className="flex-1 min-w-0">
								<PlanCard
									plan={activePlan}
									index={activeIndex}
									onSelect={() => {}}
									onDelete={() => {}}
								/>
							</div>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			<ConfirmModal
				isOpen={deletingPlan !== null}
				title="Excluir Treino?"
				description={`Tem certeza que deseja excluir o treino "${deletingPlan?.name}"? Isso removerá permanentemente todos os exercícios vinculados a ele.`}
				onConfirm={async () => {
					if (!deletingPlan) return;
					await deletePlan(deletingPlan.id);
					setDeletingPlan(null);
					onChanged();
				}}
				onCancel={() => setDeletingPlan(null)}
			/>
		</div>
	);
}
