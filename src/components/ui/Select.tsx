import { useState } from "react";

interface Option {
	value: string;
	label: string;
}

interface SelectProps {
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
}

export function Select({
	value,
	onChange,
	options,
	placeholder = "Selecione...",
}: SelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<div className="relative w-full text-left">
			{/* Trigger */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl focus:outline-none transition-all text-[0.95rem] font-semibold border text-left cursor-pointer"
				style={{
					background: "rgba(255,255,255,0.05)",
					borderColor: isOpen ? "var(--accent-color)" : "var(--card-border)",
					color: selectedOption ? "var(--text-primary)" : "var(--text-muted)",
				}}
			>
				<span>{selectedOption ? selectedOption.label : placeholder}</span>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="transition-transform duration-200"
					style={{
						transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
						color: "var(--text-muted)",
					}}
				>
					<title>Chevron</title>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>

			{/* Dropdown Menu Backdrop (to click outside) */}
			{isOpen && (
				<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
			)}

			{/* Dropdown Content */}
			{isOpen && (
				<div
					className="absolute left-0 right-0 mt-1.5 rounded-xl border z-50 overflow-hidden shadow-2xl flex flex-col gap-0.5 p-1 max-h-60 overflow-y-auto"
					style={{
						background: "#1c1c1f",
						borderColor: "var(--card-border)",
					}}
				>
					{options.map((opt) => {
						const isSelected = opt.value === value;
						return (
							<button
								key={opt.value}
								type="button"
								onClick={() => {
									onChange(opt.value);
									setIsOpen(false);
								}}
								className="w-full text-left py-2 px-3 rounded-lg text-[0.9rem] font-semibold cursor-pointer transition-all flex items-center justify-between"
								style={{
									background: isSelected ? "var(--accent-soft)" : "transparent",
									color: isSelected
										? "var(--accent-color)"
										: "var(--text-primary)",
								}}
								onMouseEnter={(e) => {
									if (!isSelected) {
										e.currentTarget.style.background = "rgba(255,255,255,0.04)";
									}
								}}
								onMouseLeave={(e) => {
									if (!isSelected) {
										e.currentTarget.style.background = "transparent";
									}
								}}
							>
								<span>{opt.label}</span>
								{isSelected && (
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<title>Check</title>
										<path d="M20 6 9 17l-5-5" />
									</svg>
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
