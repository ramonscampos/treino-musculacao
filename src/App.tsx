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

		// Generate dynamic SVG favicon using preset accent color
		const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0c" rx="100"/>
  <path d="M128 200h40v112h-40zM344 200h40v112h-40zM152 232h208v48H152z" fill="${preset.accentColor}"/>
  <rect x="80" y="176" width="24" height="160" fill="${preset.accentColor}" rx="8"/>
  <rect x="408" y="176" width="24" height="160" fill="${preset.accentColor}" rx="8"/>
  <text x="50%" y="420" font-family="sans-serif" font-weight="bold" font-size="64" fill="${preset.accentColor}" text-anchor="middle">IRON</text>
</svg>`;
		const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
		const svgUrl = URL.createObjectURL(svgBlob);

		const favicon = document.querySelector(
			'link[rel="icon"]',
		) as HTMLLinkElement | null;
		if (favicon) favicon.setAttribute("href", svgUrl);

		const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
		const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

		// Generate PNG Data URI using Canvas (required for apple-touch-icon on iOS)
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = svgDataUri;
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = 180;
			canvas.height = 180;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(img, 0, 0, 180, 180);
				const pngDataUri = canvas.toDataURL("image/png");

				const touchIcon = document.getElementById("apple-touch-icon");
				if (touchIcon) touchIcon.setAttribute("href", pngDataUri);

				// Generate dynamic manifest JSON with the color-matched PWA icons (both SVG and PNG)
				const manifestObject = {
					name: "Iron Protocol",
					short_name: "Iron",
					description: "Rastreador de treinos de musculação",
					start_url: "./index.html",
					display: "standalone",
					background_color: "#0a0a0c",
					theme_color: "#0a0a0c",
					orientation: "portrait",
					icons: [
						{
							src: svgDataUri,
							sizes: "any",
							type: "image/svg+xml",
							purpose: "any maskable",
						},
						{
							src: pngDataUri,
							sizes: "180x180",
							type: "image/png",
							purpose: "any maskable",
						},
					],
				};

				const manifestDataUri = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(manifestObject))}`;
				const manifestId = "pwa-manifest-link";
				let link = document.getElementById(manifestId) as HTMLLinkElement | null;
				if (!link) {
					link = document.createElement("link");
					link.id = manifestId;
					link.rel = "manifest";
					document.head.appendChild(link);
				}
				link.href = manifestDataUri;
			}
		};

		document.title = "Iron Protocol";

		return () => {
			URL.revokeObjectURL(svgUrl);
		};
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
