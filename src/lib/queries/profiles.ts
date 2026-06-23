import { supabase } from "../supabase";

export interface Profile {
	id: string;
	name: string;
	theme_color: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
	const { data, error } = await supabase
		.from("profiles")
		.select("id, name, theme_color")
		.eq("id", userId)
		.single();

	if (error) {
		console.error("Erro ao buscar perfil do usuário:", error.message);
		return null;
	}
	return data as Profile;
}

export async function createProfile(userId: string, name: string, themeColor = "green"): Promise<Profile> {
	const { data, error } = await supabase
		.from("profiles")
		.insert({ id: userId, name, theme_color: themeColor })
		.select("id, name, theme_color")
		.single();

	if (error) {
		console.error("Erro ao criar perfil do usuário:", error.message);
		throw error;
	}
	return data as Profile;
}

export async function updateProfileColor(userId: string, color: string): Promise<void> {
	const { error } = await supabase
		.from("profiles")
		.update({ theme_color: color })
		.eq("id", userId);

	if (error) {
		console.error("Erro ao atualizar cor do tema do usuário:", error.message);
		throw error;
	}
}
