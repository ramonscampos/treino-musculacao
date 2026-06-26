import { Modal } from "./Modal";

interface Props {
	isOpen: boolean;
	title: string;
	description: string;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
	confirmText?: string;
	cancelText?: string;
	variant?: "danger" | "warning" | "info";
}

export function ConfirmModal({
	isOpen,
	title,
	description,
	onConfirm,
	onCancel,
	confirmText = "Excluir",
	cancelText = "Cancelar",
	variant = "danger",
}: Props) {
	return (
		<Modal isOpen={isOpen} onClose={onCancel} variant="sheet" title={title}>
			<div className="flex flex-col gap-5">
				<p
					className="text-[0.92rem] leading-relaxed"
					style={{ color: "var(--text-secondary)" }}
				>
					{description}
				</p>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="flex-1 py-3 px-4 rounded-xl font-semibold text-[0.9rem] cursor-pointer transition-all active:scale-[0.97]"
						style={{
							background: "rgba(255, 255, 255, 0.05)",
							border: "1px solid rgba(255, 255, 255, 0.08)",
							color: "var(--text-primary)",
						}}
					>
						{cancelText}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="flex-1 py-3 px-4 rounded-xl font-semibold text-[0.9rem] cursor-pointer transition-all active:scale-[0.97]"
						style={{
							background:
								variant === "danger"
									? "rgba(255, 78, 78, 0.15)"
									: "var(--accent-color)",
							border:
								variant === "danger"
									? "1px solid rgba(255, 78, 78, 0.3)"
									: "none",
							color: variant === "danger" ? "rgba(255, 100, 100, 1)" : "#000",
							boxShadow:
								variant === "danger" ? "none" : "0 4px 14px var(--accent-glow)",
						}}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	);
}
