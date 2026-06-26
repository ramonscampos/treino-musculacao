import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useState } from "react";

type ReorderFn = (items: { id: number; sortOrder: number }[]) => Promise<void>;

/**
 * Generic hook for optimistic drag-and-drop reordering.
 * Keeps local state in sync and persists to DB in background after drag ends.
 */
export function useSortableList<T extends { id: number }>(
	initial: T[],
	persistReorder: ReorderFn,
) {
	const [items, setItems] = useState<T[]>(initial);

	const handleDragEnd = useCallback(
		(activeId: number, overId: number) => {
			if (activeId === overId) return;

			setItems((prev) => {
				const oldIndex = prev.findIndex((i) => i.id === activeId);
				const newIndex = prev.findIndex((i) => i.id === overId);
				if (oldIndex === -1 || newIndex === -1) return prev;
				const next = arrayMove(prev, oldIndex, newIndex);

				// Persist in background — don't await so UI is instant
				persistReorder(
					next.map((item, idx) => ({ id: item.id, sortOrder: idx })),
				).catch(console.error);

				return next;
			});
		},
		[persistReorder],
	);

	// Sync when the parent prop changes (e.g. after a refetch)
	const syncItems = useCallback((next: T[]) => {
		setItems(next);
	}, []);

	return { items, handleDragEnd, syncItems };
}
