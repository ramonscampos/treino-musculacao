interface Props {
	streak: number;
}

export function StreakWidget({ streak }: Props) {
	return (
		<div
			className="flex flex-col items-center gap-[0.1rem] bg-[var(--accent-soft)] border border-[var(--accent-mute)] rounded-2xl py-[0.6rem] px-4 min-w-[72px]"
			title="Dias seguidos treinando"
		>
			<span
				className="text-[1.8rem] font-bold leading-none"
				style={{ fontFamily: "Outfit", color: "var(--accent-color)" }}
			>
				{streak}
			</span>
			<span className="text-[0.6rem] uppercase tracking-[0.1rem] text-[var(--text-muted)] font-semibold text-center leading-[1.3]">
				dias
			</span>
		</div>
	);
}
