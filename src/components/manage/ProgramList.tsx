import { useEffect, useRef, useState } from "react";
import { createProgram, deleteProgram } from "../../lib/queries/manage";
import { COLOR_PRESETS, type Program, type User } from "../../types";

interface Props {
	user: User;
	updateThemeColor: (color: string) => Promise<void>;
	programs: Program[];
	onSelectProgram: (p: Program) => void;
	onChanged: () => void;
}

export function ProgramList({
	user,
	updateThemeColor,
	programs,
	onSelectProgram,
	onChanged,
}: Props) {
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (creating) {
			inputRef.current?.focus();
		}
	}, [creating]);

	async function handleCreate() {
		if (!newName.trim()) return;
		await createProgram(newName.trim(), newDesc.trim() || undefined);
		setNewName("");
		setNewDesc("");
		setCreating(false);
		onChanged();
	}

	async function handleDelete(p: Program) {
		if (
			!confirm(`Excluir "${p.name}"? Isso remove todos os treinos do programa.`)
		)
			return;
		await deleteProgram(p.id);
		onChanged();
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2
					className="text-[1rem] font-bold"
					style={{ color: "var(--text-primary)" }}
				>
					Meus Programas
				</h2>
				{!creating && (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.82rem] font-semibold cursor-pointer transition-all active:opacity-70"
						style={{ background: "var(--accent-color)", color: "#000" }}
					>
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
						Novo programa
					</button>
				)}
			</div>

			{creating && (
				<div
					className="flex flex-col gap-3 p-3 rounded-2xl"
					style={{
						background: "rgba(255,255,255,0.04)",
						border: "1px solid rgba(255,255,255,0.08)",
					}}
				>
					<input
						ref={inputRef}
						type="text"
						placeholder="Nome do programa (ex: Plano de Hipertrofia)"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
						className="px-3 py-2 rounded-xl text-[0.9rem] outline-none w-full"
						style={{
							background: "rgba(255,255,255,0.05)",
							border: "1px solid var(--accent-mute)",
							color: "var(--text-primary)",
						}}
					/>
					<input
						type="text"
						placeholder="Descrição (opcional)"
						value={newDesc}
						onChange={(e) => setNewDesc(e.target.value)}
						className="px-3 py-2 rounded-xl text-[0.9rem] outline-none w-full"
						style={{
							background: "rgba(255,255,255,0.05)",
							border: "1px solid rgba(255,255,255,0.1)",
							color: "var(--text-primary)",
						}}
					/>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleCreate}
							className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
							style={{ background: "var(--accent-color)", color: "#000" }}
						>
							Criar
						</button>
						<button
							type="button"
							onClick={() => setCreating(false)}
							className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
							style={{ color: "var(--text-secondary)" }}
						>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{programs.length === 0 && !creating && (
				<p
					className="text-center py-8 text-[0.9rem]"
					style={{ color: "var(--text-secondary)" }}
				>
					Nenhum programa criado ainda.
				</p>
			)}

			{programs.map((p) => (
				<div
					key={p.id}
					className="flex items-center justify-between gap-3 p-3 rounded-2xl"
					style={{
						background: "rgba(255,255,255,0.04)",
						border: "1px solid rgba(255,255,255,0.07)",
					}}
				>
					<button
						type="button"
						onClick={() => onSelectProgram(p)}
						className="flex-1 text-left flex items-center justify-between gap-3 min-w-0 cursor-pointer transition-all active:opacity-70"
					>
						<div className="flex flex-col gap-0.5 min-w-0 flex-1">
							<span
								className="text-[0.9rem] font-semibold truncate"
								style={{ color: "var(--text-primary)" }}
							>
								{p.name}
							</span>
							{p.description && (
								<span
									className="text-[0.78rem]"
									style={{ color: "var(--text-secondary)" }}
								>
									{p.description}
								</span>
							)}
						</div>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							style={{ color: "var(--text-secondary)" }}
							aria-hidden="true"
							className="shrink-0"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</button>
					<div
						className="flex items-center shrink-0 border-l pl-2"
						style={{ borderColor: "rgba(255,255,255,0.06)" }}
					>
						<button
							type="button"
							onClick={() => handleDelete(p)}
							className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
							style={{ color: "rgba(255,80,80,0.6)" }}
							aria-label="Excluir programa"
						>
							<svg
								width="15"
								height="15"
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
			))}

			{/* Color Configuration Section */}
			<div
				className="mt-8 border-t pt-6"
				style={{ borderColor: "rgba(255,255,255,0.07)" }}
			>
				<h3
					className="text-[0.72rem] uppercase tracking-[0.12rem] font-bold mb-4"
					style={{ color: "var(--text-muted)" }}
				>
					Aparência do Aplicativo
				</h3>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
		</div>
	);
}
