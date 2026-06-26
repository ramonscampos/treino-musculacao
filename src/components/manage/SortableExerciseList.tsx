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
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { reorderExercises } from "../../lib/queries/manage";
import type { PlanExercise } from "../../types";

interface Props {
	exercises: PlanExercise[];
	onReorder: (next: PlanExercise[]) => void;
	onEdit: (ex: PlanExercise) => void;
	onRemove: (id: number) => void;
}

// --- Grip icon ---
function GripHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			{...props}
			className="flex items-center justify-center px-2 self-stretch cursor-grab active:cursor-grabbing touch-none shrink-0"
			style={{ color: "var(--text-muted)" }}
			aria-label="Arrastar para reordenar"
		>
			<svg
				width="13"
				height="13"
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

// --- Individual exercise card ---
interface ExerciseCardProps {
	ex: PlanExercise;
	exercises: PlanExercise[];
	isDragging?: boolean;
	onEdit: (ex: PlanExercise) => void;
	onRemove: (id: number) => void;
}

function ExerciseRow({
	ex,
	exercises,
	isDragging,
	onEdit,
	onRemove,
}: ExerciseCardProps) {
	return (
		<div
			className="flex flex-col gap-2 p-3 rounded-2xl"
			style={{
				background: isDragging
					? "rgba(255,255,255,0.07)"
					: "rgba(255,255,255,0.04)",
				border: isDragging
					? "1px solid var(--accent-mute)"
					: "1px solid rgba(255,255,255,0.07)",
				opacity: isDragging ? 0.5 : 1,
			}}
		>
			<div className="flex items-center justify-between gap-2">
				<span
					className="text-[0.9rem] font-medium"
					style={{ color: "var(--text-primary)" }}
				>
					{ex.exerciseName}
				</span>
				<div className="flex gap-2 items-center">
					<button
						type="button"
						onClick={() => onEdit(ex)}
						className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
						style={{ color: "var(--text-secondary)" }}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => onRemove(ex.id)}
						className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
						style={{ color: "rgba(255,80,80,0.7)" }}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
						</svg>
					</button>
				</div>
			</div>

			{/* Params summary */}
			<div className="flex flex-col gap-1">
				<div className="flex gap-3 flex-wrap items-center">
					{ex.sets && (
						<span
							className="text-[0.78rem] font-bold"
							style={{ color: "var(--text-secondary)" }}
						>
							{ex.sets} séries
						</span>
					)}
					{ex.extra ? (
						<span
							className="text-[0.78rem]"
							style={{ color: "var(--text-secondary)" }}
						>
							reps: {ex.extra}
						</span>
					) : (
						(ex.repsMin || ex.repsMax) && (
							<span
								className="text-[0.78rem]"
								style={{ color: "var(--text-secondary)" }}
							>
								{ex.repsMin}
								{ex.repsMax && ex.repsMax !== ex.repsMin
									? `–${ex.repsMax}`
									: ""}{" "}
								reps
							</span>
						)
					)}
					{ex.restSeconds && (
						<span
							className="text-[0.78rem]"
							style={{ color: "var(--text-secondary)" }}
						>
							⏱{" "}
							{ex.restSeconds >= 60
								? `${Math.floor(ex.restSeconds / 60)}min`
								: `${ex.restSeconds}s`}{" "}
							descanso
						</span>
					)}
					{ex.muscleFocus && (
						<span
							className="text-[0.78rem] px-2 py-0.5 rounded bg-white/5"
							style={{ color: "var(--text-secondary)" }}
						>
							🎯 {ex.muscleFocus}
						</span>
					)}
					{ex.isSupersetWith && (
						<span className="text-[0.78rem] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
							🔗 Bi-set com:{" "}
							{exercises.find((e) => e.id === ex.isSupersetWith)
								?.exerciseName || "..."}
						</span>
					)}
				</div>
				{ex.note && (
					<span
						className="text-[0.75rem] italic"
						style={{ color: "var(--text-muted)" }}
					>
						Obs: {ex.note}
					</span>
				)}
				{ex.executionCues && ex.executionCues.length > 0 && (
					<div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
						{ex.executionCues.map((cue) => (
							<span
								key={cue}
								className="text-[0.72rem]"
								style={{ color: "var(--text-muted)" }}
							>
								› {cue}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// --- Sortable wrapper ---
interface SortableRowProps extends ExerciseCardProps {
	exercises: PlanExercise[];
}

function SortableExerciseRow(props: SortableRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: props.ex.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="flex items-stretch">
			<GripHandle {...attributes} {...listeners} />
			<div className="flex-1 min-w-0">
				<ExerciseRow {...props} isDragging={isDragging} />
			</div>
		</div>
	);
}

// --- Main exported component ---
export function SortableExerciseList({
	exercises,
	onReorder,
	onEdit,
	onRemove,
}: Props) {
	const [activeId, setActiveId] = useState<number | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
		if (!over || active.id === over.id) return;

		const oldIndex = exercises.findIndex((e) => e.id === active.id);
		const newIndex = exercises.findIndex((e) => e.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const next = arrayMove(exercises, oldIndex, newIndex);
		// Update parent state immediately (optimistic)
		onReorder(next);
		// Persist to DB in background
		reorderExercises(
			next.map((item, idx) => ({ id: item.id, sortOrder: idx })),
		).catch(console.error);
	}

	const activeEx = activeId ? exercises.find((e) => e.id === activeId) : null;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
		>
			<SortableContext
				items={exercises.map((e) => e.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="flex flex-col gap-2">
					{exercises.map((ex) => (
						<SortableExerciseRow
							key={ex.id}
							ex={ex}
							exercises={exercises}
							onEdit={onEdit}
							onRemove={onRemove}
						/>
					))}
				</div>
			</SortableContext>

			<DragOverlay>
				{activeEx ? (
					<div className="flex items-stretch opacity-95 shadow-2xl">
						<GripHandle />
						<div className="flex-1 min-w-0">
							<ExerciseRow
								ex={activeEx}
								exercises={exercises}
								onEdit={() => {}}
								onRemove={() => {}}
							/>
						</div>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
