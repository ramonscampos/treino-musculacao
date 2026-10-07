import { registerSW } from "virtual:pwa-register";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * With `registerType: "autoUpdate"`, the page reloads as soon as a new
 * service worker takes control. Installed PWAs often resume from memory
 * without navigating, so also check for updates whenever the app returns
 * to the foreground.
 */
export function registerServiceWorker() {
	registerSW({
		immediate: true,
		onRegisteredSW(_swUrl, registration) {
			if (!registration) return;
			const checkForUpdate = () => {
				registration.update().catch(() => {});
			};
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible") checkForUpdate();
			});
			setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
		},
	});
}
