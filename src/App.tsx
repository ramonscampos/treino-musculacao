import { useEffect } from "react";
import { useUser } from "./hooks/useUser";
import { UserSelector } from "./components/UserSelector";
import { WorkoutView } from "./components/WorkoutView/WorkoutView";
import { USER_THEMES } from "./types";

export function App() {
	const { user, users, loading, selectUser } = useUser();

	useEffect(() => {
		if (!user) return;
		const theme = USER_THEMES[user.name];
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
			user.name === "Andressa" ? "Protocolo Gostosa 2.0" : "Iron Protocol";
	}, [user]);

	if (loading)
		return (
			<div className="min-h-dvh" style={{ background: "var(--bg-color)" }} />
		);
	if (!user) return <UserSelector users={users} onSelect={selectUser} />;
	return <WorkoutView user={user} />;
}
