import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: false,
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,woff2}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts",
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
						},
					},
				],
			},
		}),
	],
});
