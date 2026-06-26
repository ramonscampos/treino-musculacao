interface Props {
	streak: number;
	loading?: boolean;
}

export function StreakWidget({ streak, loading }: Props) {
	if (loading) {
		return (
			<div
				className="flex flex-col items-center gap-[0.1rem] bg-(--accent-soft) border border-(--accent-mute) rounded-2xl py-[0.6rem] px-4 min-w-18 animate-pulse"
				title="Carregando..."
			>
				<div className="h-7 w-6 bg-white/10 rounded my-[0.15rem]" />
				<div className="h-2.5 w-8 bg-white/10 rounded my-[0.15rem]" />
			</div>
		);
	}

	return (
		<div
			className="flex flex-col items-center gap-[0.1rem] bg-(--accent-soft) border border-(--accent-mute) rounded-2xl py-[0.6rem] px-4 min-w-18"
			title="Dias seguidos treinando"
		>
			<span
				className="text-[1.8rem] font-bold leading-none"
				style={{ fontFamily: "Outfit", color: "var(--accent-color)" }}
			>
				{streak}
			</span>
			<span className="text-[0.6rem] uppercase tracking-[0.1rem] text-(--text-muted) font-semibold text-center leading-[1.3]">
				dias
			</span>
		</div>
	);
}
