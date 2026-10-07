import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { App } from "./App";
import { ToastProvider } from "./components/ui/Toast";
import { registerServiceWorker } from "./lib/registerServiceWorker";

const container = document.getElementById("root");
if (container) {
	createRoot(container).render(
		<StrictMode>
			<ToastProvider>
				<App />
			</ToastProvider>
		</StrictMode>,
	);
}

registerServiceWorker();
