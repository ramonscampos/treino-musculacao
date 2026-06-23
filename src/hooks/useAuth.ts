import { useEffect, useState } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { User } from "../types";
import { getProfile, createProfile, updateProfileColor } from "../lib/queries/profiles";

async function fetchOrCreateProfile(sessionUser: SupabaseUser): Promise<User> {
	const profile = await getProfile(sessionUser.id);
	const meta = sessionUser.user_metadata;
	const avatarUrl = (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined);
	if (profile) {
		return {
			id: profile.id,
			name: profile.name,
			themeColor: profile.theme_color,
			avatarUrl,
		};
	}
	// Fallback/Create profile in table if not present
	const name =
		(meta.full_name as string | undefined) ??
		(meta.name as string | undefined) ??
		"Usuário";
	try {
		const newProfile = await createProfile(sessionUser.id, name, "green");
		return {
			id: newProfile.id,
			name: newProfile.name,
			themeColor: newProfile.theme_color,
			avatarUrl,
		};
	} catch {
		return {
			id: sessionUser.id,
			name,
			themeColor: "green",
			avatarUrl,
		};
	}
}

export function useAuth() {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function init() {
			// Check for OAuth error params in URL first
			const url = new URL(window.location.href);
			const errorDesc = url.searchParams.get("error_description");
			const errorCode = url.searchParams.get("error_code");
			if (errorDesc || errorCode) {
				setError(decodeOAuthError(errorDesc, errorCode));
				// Clean error params from URL
				url.searchParams.delete("error");
				url.searchParams.delete("error_code");
				url.searchParams.delete("error_description");
				window.history.replaceState({}, document.title, url.toString());
				setLoading(false);
				return;
			}

			// Supabase v2 handles hash tokens automatically in getSession,
			// but onAuthStateChange may not fire on initial load. We poll once
			// after a short delay to catch any session established by the OAuth
			// redirect callback that may have raced with our first getSession call.
			const { data } = await supabase.auth.getSession();
			if (data.session) {
				setSession(data.session);
				const mappedUser = await fetchOrCreateProfile(data.session.user);
				setUser(mappedUser);
				setLoading(false);
				return;
			}
			// If no session yet, wait a tick for the hash parser to finish
			await new Promise((r) => setTimeout(r, 300));
			const { data: retry } = await supabase.auth.getSession();
			if (retry.session) {
				setSession(retry.session);
				const mappedUser = await fetchOrCreateProfile(retry.session.user);
				setUser(mappedUser);
			}
			setLoading(false);
		}
		init();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			setSession(session);
			if (session) {
				const mappedUser = await fetchOrCreateProfile(session.user);
				setUser(mappedUser);
			} else {
				setUser(null);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	async function signInWithGoogle() {
		setError(null);
		const { error: oauthError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: window.location.origin },
		});
		if (oauthError) {
			setError(oauthError.message || "Erro ao iniciar login com Google.");
		}
	}

	async function signInWithApple() {
		setError(null);
		const { error: oauthError } = await supabase.auth.signInWithOAuth({
			provider: "apple",
			options: { redirectTo: window.location.origin },
		});
		if (oauthError) {
			setError(oauthError.message || "Erro ao iniciar login com Apple.");
		}
	}

	async function signOut() {
		await supabase.auth.signOut();
	}

	async function updateThemeColor(color: string) {
		if (!user) return;
		try {
			await updateProfileColor(user.id, color);
			setUser((prev) => (prev ? { ...prev, themeColor: color } : null));
		} catch (err) {
			console.error("Erro ao atualizar cor do tema:", err);
		}
	}

	return {
		session,
		user,
		loading,
		error,
		signInWithGoogle,
		signInWithApple,
		signOut,
		updateThemeColor,
	};
}

function decodeOAuthError(description: string | null, code: string | null): string {
	if (description?.includes("Database error saving new user")) {
		return "Erro no servidor ao criar usuário. O projeto pode estar indisponível.";
	}
	if (description?.includes("popup_closed_by_user")) {
		return "Login cancelado.";
	}
	if (description) {
		return description;
	}
	if (code) {
		return `Erro de autenticação: ${code}`;
	}
	return "Erro desconhecido no login.";
}
