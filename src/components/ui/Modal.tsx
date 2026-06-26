import { useEffect, useState } from "react";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	variant?: "fullscreen" | "sheet";
	title?: string;
	children: React.ReactNode;
}

export function Modal({
	isOpen,
	onClose,
	variant = "sheet",
	title,
	children,
}: Props) {
	const [active, setActive] = useState(false);
	const [shouldRender, setShouldRender] = useState(isOpen);

	if (isOpen && !shouldRender) {
		setShouldRender(true);
	}

	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				setActive(true);
			}, 10);
			document.body.style.overflow = "hidden";
			return () => clearTimeout(timer);
		}
		setTimeout(() => {
			setActive(false);
		}, 0);
		const timer = setTimeout(
			() => {
				setShouldRender(false);
			},
			variant === "fullscreen" ? 420 : 300,
		);
		document.body.style.overflow = "";
		return () => clearTimeout(timer);
	}, [isOpen, variant]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		return () => {
			document.body.style.overflow = "";
		};
	}, []);

	if (!shouldRender) return null;

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (variant === "fullscreen") {
		return (
			<div
				className="fixed inset-0 z-50 flex flex-col mx-auto max-w-150 transition-transform duration-420"
				style={{
					background: "var(--bg-color)",
					transform: active ? "translateY(0)" : "translateY(100%)",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				<div className="flex-1 flex flex-col p-6 pt-[calc(1.5rem+var(--safe-top))] pb-0 overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between mb-8 shrink-0">
						<h2
							className="text-[1.75rem] font-bold tracking-[-0.02em]"
							style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
						>
							{title}
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="w-11 h-11 flex items-center justify-center rounded-full transition-all active:bg-[rgba(255,255,255,0.1)] cursor-pointer"
							style={{
								background: "var(--card-bg)",
								border: "1px solid var(--card-border)",
								color: "var(--text-primary)",
							}}
							aria-label="Fechar"
						>
							<svg
								aria-hidden={true}
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
					<div className="flex-1 flex flex-col overflow-hidden">
						{children}
					</div>
				</div>
			</div>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: backdrop click handles modal close, button role is not semantic here
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key is handled globally on the window object
		<div
			className="fixed inset-0 z-10000 flex items-end justify-center transition-opacity duration-250"
			style={{
				background: "rgba(0,0,0,0.7)",
				backdropFilter: active ? "blur(8px)" : "none",
				opacity: active ? 1 : 0,
				pointerEvents: active ? "all" : "none",
			}}
			onClick={handleBackdropClick}
			role="button"
			tabIndex={-1}
		>
			<div
				className="w-full max-w-150 transition-transform duration-300"
				style={{
					background: "#18181b",
					border: "1px solid var(--card-border)",
					borderRadius: "1.5rem 1.5rem 0 0",
					padding:
						"1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))",
					transform: active ? "translateY(0)" : "translateY(100%)",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				<div
					className="w-10 h-1 rounded-full mx-auto mb-5"
					style={{ background: "rgba(255,255,255,0.15)" }}
				/>
				{title && (
					<div
						className="text-[1.2rem] font-bold mb-4"
						style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
					>
						{title}
					</div>
				)}
				{children}
			</div>
		</div>
	);
}
