/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from "react";

interface ToastContextValue {
	showToast: (message: string) => void;
}
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export function useToast() {
	return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [message, setMessage] = useState<string | null>(null);

	const showToast = useCallback((msg: string) => {
		setMessage(msg);
		setTimeout(() => setMessage(null), 2500);
	}, []);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{message && (
				<div
					className="fixed bottom-24 left-1/2 -translate-x-1/2 z-100 px-4 py-2 rounded-xl text-sm font-medium shadow-lg pointer-events-none"
					style={{
						background: "var(--card-bg)",
						border: "1px solid var(--card-border)",
						color: "var(--text-primary)",
					}}
				>
					{message}
				</div>
			)}
		</ToastContext.Provider>
	);
}
