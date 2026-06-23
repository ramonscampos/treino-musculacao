import { useEffect } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { WorkoutView } from "./components/WorkoutView/WorkoutView";
import { useAuth } from "./hooks/useAuth";
import { USER_THEMES } from "./types";

export function App() {
	const { user, loading, signInWithGoogle, signInWithApple } = useAuth();

	useEffect(() => {
		if (!user) return;
		// Theme: check user.theme, fall back to name-based lookup
		const theme = USER_THEMES[user.name] ?? USER_THEMES["Ramon"];
		if (!theme) return;
		const root = document.documentElement;
		root.style.setProperty("--accent-color", theme.accentColor);
		root.style.setProperty("--accent-glow", theme.accentGlow);
		root.style.setProperty("--accent-soft", theme.accentSoft);
		root.style.setProperty("--accent-mute", theme.accentMute);
		root.style.setProperty("--bg-color", theme.bgColor);
		root.style.setProperty("--success", theme.success);
		root.style.setProperty("--success-bg", theme.successBg);
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", theme.bgColor);
		const manifestId = "pwa-manifest-link";
		let link = document.getElementById(manifestId) as HTMLLinkElement | null;
		if (!link) {
			link = document.createElement("link");
			link.id = manifestId;
			link.rel = "manifest";
			document.head.appendChild(link);
		}
		link.href =
			user.name === "Andressa" ? "/manifest.andressa.json" : "/manifest.json";
		const touchIcon = document.getElementById("apple-touch-icon");
		if (touchIcon)
			touchIcon.setAttribute(
				"href",
				user.name === "Andressa" ? "/icon.andressa.svg" : "/icon.svg",
			);
		document.title =
			user.name === "Andressa" ? "Protocolo Gostosa 2.0" : "Forge";
	}, [user]);

	if (loading)
		return <div className="min-h-dvh" style={{ background: "var(--bg-color)" }} />;
	if (!user)
		return <LoginScreen onSignInGoogle={signInWithGoogle} onSignInApple={signInWithApple} />;
	return <WorkoutView user={user} />;
}
