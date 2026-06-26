import { formatLocalDate, type WorkoutSession } from "../../types";

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface Props {
	sessions: WorkoutSession[];
	month: number;
	year: number;
	selectedDate: string | null;
	onSelectDate: (date: string | null) => void;
	onToggleDate: (date: string) => void;
}

export function MonthCalendar({
	sessions,
	month,
	year,
	selectedDate,
	onSelectDate,
	onToggleDate,
}: Props) {
	const doneDates = new Set(sessions.map((s) => s.performedOn));
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const todayStr = formatLocalDate(new Date());
	const actualToday = new Date();

	const cells: (number | null)[] = [
		...Array(firstDay).fill(null),
		...Array.from({ length: daysInMonth }, (_, i) => i + 1),
	];

	return (
		<div>
			<div
				className="grid grid-cols-7 gap-2 p-4 rounded-[1.25rem]"
				style={{
					background: "rgba(255,255,255,0.02)",
					border: "1px solid var(--card-border)",
				}}
			>
				{WEEK_DAYS.map((d, i) => {
					const headerKey = `week-day-header-${i}`;
					return (
						<div
							key={headerKey}
							className="text-center text-[0.65rem] font-extrabold py-2 rounded-[0.4rem]"
							style={{
								background: "rgba(255,255,255,0.05)",
								color: "var(--text-primary)",
							}}
						>
							{d}
						</div>
					);
				})}
				{cells.map((day, i) => {
					const cellKey = `calendar-cell-${i}`;
					if (!day) return <div key={cellKey} className="aspect-square" />;
					const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const isDone = doneDates.has(dateStr);
					const isToday = dateStr === todayStr;
					const dateObj = new Date(year, month, day);
					const isPast = dateObj < actualToday && !isToday;
					const isSunday = dateObj.getDay() === 0;
					const isMissed = isPast && !isDone && !isSunday;
					const isSelected = dateStr === selectedDate;

					const baseStyle: React.CSSProperties = {
						aspectRatio: "1",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "0.8rem",
						fontWeight: 600,
						borderRadius: "0.6rem",
						position: "relative",
						cursor: "pointer",
						transition: "var(--transition)",
						color: "var(--text-muted)",
					};

					if (isDone) {
						baseStyle.color = "#000";
						baseStyle.zIndex = 2;
					} else if (isMissed) {
						baseStyle.color = "rgba(255, 78, 78, 0.8)";
					} else if (isToday && !isDone) {
						baseStyle.color = "var(--accent-color)";
					}

					return (
						// biome-ignore lint/a11y/useSemanticElements: backdrop div wraps dialog and handles closing click events, button is not semantic here
						<div
							key={cellKey}
							style={baseStyle}
							onClick={() => onSelectDate(isSelected ? null : dateStr)}
							role="button"
							tabIndex={-1}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									onSelectDate(isSelected ? null : dateStr);
								}
							}}
						>
							<span className="relative z-3">{day}</span>
							{/* Trained dot */}
							{isDone && (
								<span
									className="absolute inset-1.5 rounded-full z-1"
									style={{
										background: "var(--accent-color)",
										boxShadow: "0 0 10px var(--accent-glow)",
									}}
								/>
							)}
							{/* Missed ring */}
							{isMissed && (
								<span
									className="absolute inset-1.5 rounded-full z-1"
									style={{ border: "1.5px solid rgba(255, 78, 78, 0.4)" }}
								/>
							)}
							{/* Today ring */}
							{isToday && !isDone && (
								<span
									className="absolute inset-0.5 rounded-full z-1 opacity-40"
									style={{ border: "1px solid var(--accent-color)" }}
								/>
							)}
							{isToday && isDone && (
								<span
									className="absolute rounded-full z-1 opacity-80"
									style={{
										border: "1px solid var(--accent-color)",
										inset: "-2px",
									}}
								/>
							)}
							{/* Selected pulse */}
							{isSelected && (
								<span
									className="absolute rounded-xl z-2"
									style={{
										border: "2px solid var(--accent-color)",
										animation: "pulseSelect 1.5s infinite",
										inset: "-4px",
									}}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* Calendar Actions */}
			{selectedDate && (
				<div
					className="mt-4 p-5 rounded-[1.25rem] flex items-center justify-between animate-slide-up"
					style={{
						background: "rgba(255,255,255,0.03)",
						border: "1px solid var(--card-border)",
					}}
				>
					<div>
						<span
							className="text-[0.9rem] font-bold block"
							style={{ color: "var(--text-primary)" }}
						>
							{selectedDate.split("-").reverse().join("/")}
						</span>
						<span
							className="text-[0.75rem]"
							style={{ color: "var(--text-muted)" }}
						>
							{doneDates.has(selectedDate)
								? "Treino concluído"
								: "Sem registro de treino"}
						</span>
					</div>
					<label className="relative inline-block w-13 h-7 cursor-pointer">
						<input
							type="checkbox"
							className="sr-only"
							checked={doneDates.has(selectedDate)}
							onChange={() => onToggleDate(selectedDate)}
						/>
						<div
							className="relative w-13 h-7 rounded-full transition-all duration-200"
							style={{
								background: doneDates.has(selectedDate)
									? "var(--accent-color)"
									: "rgba(255,255,255,0.1)",
								border: "1px solid var(--card-border)",
							}}
						>
							<div
								className="absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full transition-all duration-200"
								style={{
									background: doneDates.has(selectedDate) ? "#000" : "#fff",
									transform: doneDates.has(selectedDate)
										? "translateX(24px)"
										: "translateX(0)",
									boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
								}}
							/>
						</div>
					</label>
				</div>
			)}
		</div>
	);
}
