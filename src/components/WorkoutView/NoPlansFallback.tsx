interface Props {
	onCreateClick: () => void;
	title?: string;
	description?: string;
	buttonText?: string;
}

export function NoPlansFallback({
	onCreateClick,
	title = "Nenhum treino cadastrado",
	description = "Você precisa criar um plano de treinos (ex: Peito + Tríceps) para começar a utilizar o aplicativo e registrar sua evolução de cargas.",
	buttonText = "Criar Meu Primeiro Treino",
}: Props) {
	return (
		<div
			className="animate-fade-in p-8 rounded-[1.75rem] text-center flex flex-col items-center justify-center gap-6"
			style={{
				background: "var(--card-bg)",
				border: "1px solid var(--card-border)",
				backdropFilter: "blur(10px)",
			}}
		>
			<div
				className="w-16 h-16 rounded-2xl flex items-center justify-center text-[2rem]"
				style={{
					background: "var(--accent-soft)",
					border: "1px dashed var(--accent-mute)",
					color: "var(--accent-color)",
				}}
			>
				🏋️
			</div>
			<div className="flex flex-col gap-2 max-w-sm">
				<h2
					className="text-[1.25rem] font-bold tracking-[-0.02em]"
					style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
				>
					{title}
				</h2>
				<p
					className="text-[0.9rem] leading-relaxed"
					style={{ color: "var(--text-secondary)" }}
				>
					{description}
				</p>
			</div>
			<button
				type="button"
				onClick={onCreateClick}
				className="px-5 py-3 rounded-2xl font-bold text-[0.95rem] transition-all active:scale-[0.96] cursor-pointer flex items-center gap-2"
				style={{
					background: "var(--accent-color)",
					color: "#000",
					fontFamily: "Outfit",
					boxShadow: "0 4px 14px var(--accent-glow)",
				}}
			>
				<svg
					aria-hidden="true"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
				{buttonText}
			</button>
		</div>
	);
}
