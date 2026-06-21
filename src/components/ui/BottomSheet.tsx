import { useEffect, useState } from "react";

interface Props {
	open: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
}

export function BottomSheet({ open, onClose, children, title }: Props) {
	const [shouldRender, setShouldRender] = useState(open);
	const [animate, setAnimate] = useState(open);
	const [prevOpen, setPrevOpen] = useState(open);

	if (open !== prevOpen) {
		setPrevOpen(open);
		if (open) {
			setShouldRender(true);
		} else {
			setAnimate(false);
		}
	}

	useEffect(() => {
		if (open) {
			const timer = setTimeout(() => {
				setAnimate(true);
			}, 10);
			return () => clearTimeout(timer);
		}

		const timer = setTimeout(() => {
			setShouldRender(false);
		}, 300);
		return () => clearTimeout(timer);
	}, [open]);

	useEffect(() => {
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!shouldRender) return null;

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: backdrop div wraps content and handles closing clicks, button is not semantic here
		<div
			className="fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300"
			style={{
				background: "rgba(0,0,0,0.6)",
				opacity: animate ? 1 : 0,
			}}
			onClick={handleBackdropClick}
			role="button"
			tabIndex={-1}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
		>
			<div
				className="w-full max-w-[600px] rounded-t-2xl p-6 max-h-[85dvh] overflow-y-auto transition-transform duration-300"
				style={{
					background: "#16161a",
					border: "1px solid var(--card-border)",
					transform: animate ? "translateY(0)" : "translateY(100%)",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				<div
					className="w-10 h-1 rounded-full mx-auto mb-4"
					style={{ background: "var(--card-border)" }}
				/>
				{title && (
					<p
						className="font-semibold text-base mb-4"
						style={{ color: "var(--text-primary)" }}
					>
						{title}
					</p>
				)}
				{children}
			</div>
		</div>
	);
}
