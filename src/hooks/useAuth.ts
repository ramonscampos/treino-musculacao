import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

export function useAuth() {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session) setUser(mapUser(session));
			setLoading(false);
		});

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
