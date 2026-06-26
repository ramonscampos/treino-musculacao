import { useEffect } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { WorkoutView } from "./components/WorkoutView/WorkoutView";
import { useAuth } from "./hooks/useAuth";
import { COLOR_PRESETS } from "./types";

export function App() {
	const {
		user,
		loading,
		error,
		signInWithGoogle,
		signInWithApple,
		updateThemeColor,
		signOut,
	} = useAuth();

	useEffect(() => {
		if (!user) return;
		// Theme: lookup selected color preset (fallback to green)
		const preset = COLOR_PRESETS[user.themeColor] ?? COLOR_PRESETS.green;
		const root = document.documentElement;
		root.style.setProperty("--accent-color", preset.accentColor);
		root.style.setProperty("--accent-glow", preset.accentGlow);
		root.style.setProperty("--accent-soft", preset.accentSoft);
		root.style.setProperty("--accent-mute", preset.accentMute);
		root.style.setProperty("--bg-color", "#0a0a0c");
		root.style.setProperty("--success", preset.success);
		root.style.setProperty("--success-bg", preset.successBg);
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", "#0a0a0c");

		document.title = "Iron Protocol";
	}, [user]);

	if (loading)
		return (
			<div className="min-h-dvh" style={{ background: "var(--bg-color)" }} />
		);
	if (!user)
		return (
			<LoginScreen
				onSignInGoogle={signInWithGoogle}
				onSignInApple={signInWithApple}
				error={error}
			/>
		);
	return (
		<WorkoutView
			user={user}
			updateThemeColor={updateThemeColor}
			signOut={signOut}
		/>
	);
}
