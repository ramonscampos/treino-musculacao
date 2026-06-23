import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

export function useAuth() {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function init() {
			// Supabase v2 handles hash tokens automatically in getSession,
			// but onAuthStateChange may not fire on initial load. We poll once
			// after a short delay to catch any session established by the OAuth
			// redirect callback that may have raced with our first getSession call.
			const { data } = await supabase.auth.getSession();
			if (data.session) {
				setSession(data.session);
				setUser(mapUser(data.session));
				setLoading(false);
				return;
			}
			// If no session yet, wait a tick for the hash parser to finish
			await new Promise((r) => setTimeout(r, 300));
			const { data: retry } = await supabase.auth.getSession();
			if (retry.session) {
				setSession(retry.session);
				setUser(mapUser(retry.session));
			}
			setLoading(false);
		}
		init();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser(session ? mapUser(session) : null);
		});

		return () => subscription.unsubscribe();
	}, []);

	async function signInWithGoogle() {
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: window.location.origin },
		});
	}

	async function signInWithApple() {
		await supabase.auth.signInWithOAuth({
			provider: "apple",
			options: { redirectTo: window.location.origin },
		});
	}

	async function signOut() {
		await supabase.auth.signOut();
	}

	return { session, user, loading, signInWithGoogle, signInWithApple, signOut };
}

function mapUser(session: Session): User {
	const meta = session.user.user_metadata;
	return {
		id: session.user.id,
		name:
			(meta.full_name as string | undefined) ??
			(meta.name as string | undefined) ??
			"Usuário",
		theme: "default",
	};
}
