import { COLOR_PRESETS, type User } from "../../types";

interface Props {
	user: User;
	updateThemeColor: (color: string) => Promise<void>;
	signOut: () => Promise<void>;
}

export function ConfigScreen({ user, updateThemeColor, signOut }: Props) {
	return (
		<div className="flex flex-col gap-6 p-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(2rem+var(--safe-bottom))] animate-fade-in">
			<div>
				<h2
					className="text-[1.75rem] font-bold tracking-[-0.02em]"
					style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
				>
					Configurações
				</h2>
			</div>

			{/* Perfil */}
			<div
				className="flex items-center gap-4 p-4 rounded-[1.25rem] border"
				style={{
					background: "var(--card-bg)",
					borderColor: "var(--card-border)",
				}}
			>
				{user.avatarUrl ? (
					<img
						src={user.avatarUrl}
						alt={user.name}
						className="w-14 h-14 rounded-full object-cover border"
						style={{ borderColor: "var(--accent-mute)" }}
					/>
				) : (
					<div
						className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-[1.4rem] border"
						style={{
							borderColor: "var(--accent-mute)",
							background: "var(--accent-soft)",
							color: "var(--accent-color)",
							fontFamily: "Outfit",
						}}
					>
						{user.name.charAt(0).toUpperCase()}
					</div>
				)}
				<div className="flex flex-col gap-0.5">
					<span
						className="text-[1rem] font-bold"
						style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
					>
						{user.name}
					</span>
					<span
						className="text-[0.75rem] uppercase tracking-[0.08rem] font-semibold"
						style={{ color: "var(--accent-color)" }}
					>
						Usuário Ativo
					</span>
				</div>
			</div>

			{/* Aparência */}
			<div
				className="p-5 rounded-[1.25rem] border flex flex-col gap-4"
				style={{
					background: "var(--card-bg)",
					borderColor: "var(--card-border)",
				}}
			>
				<h3
					className="text-[0.75rem] uppercase tracking-[0.12rem] font-bold"
					style={{ color: "var(--text-muted)", fontFamily: "Outfit" }}
				>
					Aparência do Aplicativo
				</h3>
				<div className="grid grid-cols-2 gap-2">
					{Object.values(COLOR_PRESETS).map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => updateThemeColor(preset.id)}
							className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[0.82rem] font-semibold cursor-pointer border transition-all active:scale-[0.96]"
							style={{
								background:
									user.themeColor === preset.id
										? "var(--accent-soft)"
										: "rgba(255,255,255,0.02)",
								borderColor:
									user.themeColor === preset.id
										? "var(--accent-color)"
										: "rgba(255,255,255,0.07)",
								color:
									user.themeColor === preset.id
										? "var(--accent-color)"
										: "var(--text-secondary)",
							}}
						>
							<span
								className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
								style={{ background: preset.accentColor }}
							/>
							<span className="truncate">{preset.name}</span>
						</button>
					))}
				</div>
			</div>

			{/* Sair da Conta */}
			<button
				type="button"
				onClick={signOut}
				className="flex items-center justify-center gap-2.5 w-full py-3.5 px-5 rounded-2xl font-semibold text-[0.92rem] transition-all active:scale-[0.97] cursor-pointer border mt-2"
				style={{
					background: "rgba(255, 78, 78, 0.05)",
					borderColor: "rgba(255, 78, 78, 0.15)",
					color: "rgba(255, 100, 100, 0.9)",
				}}
			>
				<svg
					aria-hidden="true"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
					<polyline points="16 17 21 12 16 7" />
					<line x1="21" y1="12" x2="9" y2="12" />
				</svg>
				Sair da Conta
			</button>

			<p
				className="text-center text-[0.7rem] opacity-50 mt-4"
				style={{ color: "var(--text-muted)" }}
			>
				IRON PROTOCOL v2.0
			</p>
		</div>
	);
}
