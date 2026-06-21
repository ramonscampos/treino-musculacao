import type { User } from "../types";
import { USER_THEMES } from "../types";

interface Props {
	users: User[];
	onSelect: (user: User) => void;
}

export function UserSelector({ users, onSelect }: Props) {
	return (
		<div className="flex flex-col items-center justify-center min-h-dvh gap-8 p-6 mx-auto max-w-150">
			<div className="text-center">
				<p
					className="text-xs tracking-widest uppercase mb-2"
					style={{ color: "var(--text-muted)" }}
				>
					Iron Protocol
				</p>
				<h1
					className="text-2xl font-bold"
					style={{ color: "var(--text-primary)" }}
				>
					Quem vai treinar?
				</h1>
			</div>
			<div className="flex flex-col gap-3 w-full max-w-xs">
				{users.map((u) => {
					const theme = USER_THEMES[u.name];
					return (
						<button
							type="button"
							key={u.id}
							onClick={() => onSelect(u)}
							className="w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-95"
							style={{
								background: theme?.accentSoft ?? "rgba(255,255,255,0.05)",
								border: `1.5px solid ${theme?.accentMute ?? "rgba(255,255,255,0.1)"}`,
								color: theme?.accentColor ?? "#fff",
							}}
						>
							{u.name}
						</button>
					);
				})}
			</div>
		</div>
	);
}
