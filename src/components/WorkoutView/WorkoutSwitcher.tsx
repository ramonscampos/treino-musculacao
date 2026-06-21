import { BottomSheet } from "../ui/BottomSheet";
import type { WorkoutPlan } from "../../types";
import { DAY_ORDER } from "../../types";

const DAY_PT: Record<string, string> = {
	SEG: "Seg",
	TER: "Ter",
	QUA: "Qua",
	QUI: "Qui",
	SEX: "Sex",
	SAB: "Sáb",
	DOM: "Dom",
};

interface Props {
	open: boolean;
	onClose: () => void;
	plans: WorkoutPlan[];
	activePlanId?: number;
	onSelect: (planId: number) => void;
}

export function WorkoutSwitcher({
	open,
	onClose,
	plans,
	activePlanId,
	onSelect,
}: Props) {
	const sortedPlans = [...plans].sort(
		(a, b) => DAY_ORDER.indexOf(a.suggestedDay) - DAY_ORDER.indexOf(b.suggestedDay),
	);

	return (
		<BottomSheet
			open={open}
			onClose={onClose}
			title="Qual treino vai fazer hoje?"
		>
			<div className="space-y-2">
				{sortedPlans.map((plan) => {
					const isActive = plan.id === activePlanId;
					return (
						<button
							type="button"
							key={plan.id}
							onClick={() => {
								onSelect(plan.id);
								onClose();
							}}
							className="w-full text-left px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
							style={
								isActive
									? {
											background: "var(--accent-soft)",
											border: "1px solid var(--accent-mute)",
											color: "var(--accent-color)",
										}
									: {
											background: "var(--card-bg)",
											border: "1px solid var(--card-border)",
											color: "var(--text-primary)",
										}
							}
						>
							<span
								className="text-xs block"
								style={{ color: "var(--text-muted)" }}
							>
								{DAY_PT[plan.suggestedDay]}
							</span>
							<span className="font-medium">{plan.name}</span>
						</button>
					);
				})}
			</div>
		</BottomSheet>
	);
}
