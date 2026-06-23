import { useState } from "react";
import { createProgram, deleteProgram } from "../../lib/queries/manage";
import type { Program } from "../../types";

interface Props {
	programs: Program[];
	onSelectProgram: (p: Program) => void;
	onChanged: () => void;
}

export function ProgramList({ programs, onSelectProgram, onChanged }: Props) {
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDesc, setNewDesc] = useState("");

	async function handleCreate() {
		if (!newName.trim()) return;
		await createProgram(newName.trim(), newDesc.trim() || undefined);
		setNewName("");
		setNewDesc("");
		setCreating(false);
		onChanged();
	}

	async function handleDelete(p: Program) {
		if (!confirm(`Excluir "${p.name}"? Isso remove todos os treinos do programa.`)) return;
		await deleteProgram(p.id);
		onChanged();
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-[1rem] font-bold" style={{ color: "var(--text-primary)" }}>
					Meus Programas
				</h2>
				{!creating && (
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.82rem] font-semibold cursor-pointer transition-all active:opacity-70"
						style={{ background: "var(--accent-color)", color: "#000" }}
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
							<path d="M12 5v14M5 12h14" />
						</svg>
						Novo programa
					</button>
				)}
			</div>

			{creating && (
				<div className="flex flex-col gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
					<input
						autoFocus
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
						<button type="button" onClick={handleCreate}
							className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
							style={{ background: "var(--accent-color)", color: "#000" }}>
							Criar
						</button>
						<button type="button" onClick={() => setCreating(false)}
							className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
							style={{ color: "var(--text-secondary)" }}>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{programs.length === 0 && !creating && (
				<p className="text-center py-8 text-[0.9rem]" style={{ color: "var(--text-secondary)" }}>
					Nenhum programa criado ainda.
				</p>
			)}

			{programs.map((p) => (
				<div
					key={p.id}
					className="flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition-all active:opacity-70"
					style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
					onClick={() => onSelectProgram(p)}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => e.key === "Enter" && onSelectProgram(p)}
				>
					<div className="flex flex-col gap-0.5 min-w-0">
						<span className="text-[0.9rem] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
							{p.name}
						</span>
						{p.description && <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>{p.description}</span>}
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
							className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
							style={{ color: "rgba(255,80,80,0.6)" }}
							aria-label="Excluir programa"
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
								<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
							</svg>
						</button>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-secondary)" }}>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</div>
				</div>
			))}
		</div>
	);
}
