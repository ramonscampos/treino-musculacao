import { DAY_LABELS, DAY_ORDER, type DayKey } from "../../types";

interface Props {
	selected: DayKey;
	onSelect: (day: DayKey) => void;
	todayKey: DayKey;
}

export function DayTabs({ selected, onSelect, todayKey }: Props) {
	return (
		<div
			className="sticky z-50 flex gap-[0.15rem] overflow-x-auto p-1 rounded-2xl border no-scrollbar"
			style={{
				top: "calc(0.5rem + var(--safe-top))",
				background: "rgba(10,10,12,0.85)",
				borderColor: "var(--card-border)",
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
			}}
		>
			{DAY_ORDER.map((day) => {
				const isSelected = day === selected;
				const isToday = day === todayKey;
				return (
					<button
						type="button"
						key={day}
						onClick={() => onSelect(day)}
						className="flex-1 min-w-0 py-[0.55rem] px-[0.4rem] sm:px-[0.85rem] rounded-[0.65rem] text-[0.75rem] sm:text-[0.8rem] font-semibold whitespace-nowrap transition-all border-none bg-transparent text-center overflow-hidden"
						style={
							isSelected
								? { background: "var(--accent-color)", color: "#000" }
								: {
										color: isToday
											? "var(--accent-color)"
											: "var(--text-secondary)",
									}
						}
					>
						{DAY_LABELS[day]}
					</button>
				);
			})}
		</div>
	);
}
