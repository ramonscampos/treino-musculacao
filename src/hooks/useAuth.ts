import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
	createProfile,
	getProfile,
	updateProfileColor,
} from "../lib/queries/profiles";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

async function fetchOrCreateProfile(sessionUser: SupabaseUser): Promise<User> {
	const profile = await getProfile(sessionUser.id);
	const meta = sessionUser.user_metadata;
	const avatarUrl =
		(meta.avatar_url as string | undefined) ??
		(meta.picture as string | undefined);
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
		return fallbackUser(sessionUser);
	}
}

function fallbackUser(sessionUser: SupabaseUser): User {
	const meta = sessionUser.user_metadata;
	return {
		id: sessionUser.id,
		name:
			(meta.full_name as string | undefined) ??
			(meta.name as string | undefined) ??
			"Usuário",
		themeColor: "green",
		avatarUrl:
			(meta.avatar_url as string | undefined) ??
			(meta.picture as string | undefined),
	};
}

function consumeOAuthError(): string | null {
	const url = new URL(window.location.href);
	const errorDesc = url.searchParams.get("error_description");
	const errorCode = url.searchParams.get("error_code");
	if (!errorDesc && !errorCode) return null;
	url.searchParams.delete("error");
	url.searchParams.delete("error_code");
	url.searchParams.delete("error_description");
	window.history.replaceState({}, document.title, url.toString());
	return decodeOAuthError(errorDesc, errorCode);
}

export function useAuth() {
	const [session, setSession] = useState<Session | null>(null);
	const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
	const [authReady, setAuthReady] = useState(false);
	const [profile, setProfile] = useState<User | null>(null);
	const [error, setError] = useState<string | null>(() => consumeOAuthError());

	useEffect(() => {
		// Keep this callback synchronous: supabase-js awaits subscribers while
		// initializing, and any Supabase query awaited here waits for that same
		// initialization, deadlocking the app on a blank screen.
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession);
			setSessionUser((prev) =>
				prev?.id === nextSession?.user.id ? prev : (nextSession?.user ?? null),
			);
			setAuthReady(true);
		});

		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		if (!sessionUser) return;
		let active = true;
		fetchOrCreateProfile(sessionUser)
			.catch((err) => {
				console.error("Erro ao carregar perfil:", err);
				return fallbackUser(sessionUser);
			})
			.then((mappedUser) => {
				if (active) setProfile(mappedUser);
			});
		return () => {
			active = false;
		};
	}, [sessionUser]);

	const user = sessionUser && profile?.id === sessionUser.id ? profile : null;
	const loading = !authReady || (!!sessionUser && !user);

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
			setProfile((prev) => (prev ? { ...prev, themeColor: color } : null));
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

function decodeOAuthError(
	description: string | null,
	code: string | null,
): string {
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
