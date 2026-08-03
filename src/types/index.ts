export interface User {
	id: string;
	name: string;
	themeColor: string;
	avatarUrl?: string;
}

export interface Exercise {
	id: number;
	name: string;
	description?: string;
}

export interface Program {
	id: number;
	userId: string;
	name: string;
	description?: string;
	restDays: number;
}

export interface WorkoutPlan {
	id: number;
	userId: string;
	programId: number;
	name: string;
	suggestedDay: DayKey;
	title: string;
	extra?: string;
}

export interface PlanExercise {
	id: number;
	planId: number;
	exerciseId: number;
	exerciseName: string;
	description?: string;
	sets?: number;
	repsMin?: number;
	repsMax?: number;
	restSeconds?: number;
	muscleFocus?: string;
	executionCues: string[];
	note?: string;
	sortOrder: number;
	isSupersetWith?: number;
	extra?: string;
}

export interface WorkoutSession {
	id: number;
	userId: string;
	planId: number;
	performedOn: string;
}

export interface LoadLog {
	id: number;
	userId: string;
	exerciseId: number;
	planId?: number;
	loggedAt: string;
	sets: LoadLogSet[];
}

export interface LoadLogSet {
	id: number;
	logId: number;
	setNumber: number;
	weight: number;
}

export type DayKey =
	| "SEG"
	| "TER"
	| "QUA"
	| "QUI"
	| "SEX"
	| "SAB"
	| "DOM"
	| "NONE";

export const DAY_LABELS: Record<DayKey, string> = {
	SEG: "Seg",
	TER: "Ter",
	QUA: "Qua",
	QUI: "Qui",
	SEX: "Sex",
	SAB: "Sáb",
	DOM: "Dom",
	NONE: "Sem dia",
};

export const DAY_ORDER: DayKey[] = [
	"DOM",
	"SEG",
	"TER",
	"QUA",
	"QUI",
	"SEX",
	"SAB",
];

export const JS_DAY_TO_KEY: Record<number, DayKey> = {
	0: "DOM",
	1: "SEG",
	2: "TER",
	3: "QUA",
	4: "QUI",
	5: "SEX",
	6: "SAB",
};

export function formatLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export interface ColorPreset {
	id: string;
	name: string;
	accentColor: string;
	accentGlow: string;
	accentSoft: string;
	accentMute: string;
	success: string;
	successBg: string;
}

export const COLOR_PRESETS: Record<string, ColorPreset> = {
	green: {
		id: "green",
		name: "Verde Neon",
		accentColor: "#d1ff4e",
		accentGlow: "rgba(209,255,78,0.3)",
		accentSoft: "rgba(209,255,78,0.06)",
		accentMute: "rgba(209,255,78,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	blue: {
		id: "blue",
		name: "Azul Elétrico",
		accentColor: "#00f0ff",
		accentGlow: "rgba(0,240,255,0.3)",
		accentSoft: "rgba(0,240,255,0.06)",
		accentMute: "rgba(0,240,255,0.2)",
		success: "#00ff88",
		successBg: "rgba(0,255,136,0.1)",
	},
	purple: {
		id: "purple",
		name: "Violeta",
		accentColor: "#a78bfa",
		accentGlow: "rgba(167,139,250,0.3)",
		accentSoft: "rgba(167,139,250,0.06)",
		accentMute: "rgba(167,139,250,0.2)",
		success: "#34d399",
		successBg: "rgba(52,211,153,0.1)",
	},
	pink: {
		id: "pink",
		name: "Rosa Pink",
		accentColor: "#ff4da6",
		accentGlow: "rgba(255,77,166,0.3)",
		accentSoft: "rgba(255,77,166,0.06)",
		accentMute: "rgba(255,77,166,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	orange: {
		id: "orange",
		name: "Laranja Fogo",
		accentColor: "#ff7a00",
		accentGlow: "rgba(255,122,0,0.3)",
		accentSoft: "rgba(255,122,0,0.06)",
		accentMute: "rgba(255,122,0,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	yellow: {
		id: "yellow",
		name: "Amarelo Limão",
		accentColor: "#ffe600",
		accentGlow: "rgba(255,230,0,0.3)",
		accentSoft: "rgba(255,230,0,0.06)",
		accentMute: "rgba(255,230,0,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	red: {
		id: "red",
		name: "Vermelho Fúria",
		accentColor: "#ff3b30",
		accentGlow: "rgba(255,59,48,0.3)",
		accentSoft: "rgba(255,59,48,0.06)",
		accentMute: "rgba(255,59,48,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	mint: {
		id: "mint",
		name: "Verde Menta",
		accentColor: "#00f5a0",
		accentGlow: "rgba(0,245,160,0.3)",
		accentSoft: "rgba(0,245,160,0.06)",
		accentMute: "rgba(0,245,160,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
	white: {
		id: "white",
		name: "Branco Gelo",
		accentColor: "#e2fffe",
		accentGlow: "rgba(226,255,254,0.3)",
		accentSoft: "rgba(226,255,254,0.06)",
		accentMute: "rgba(226,255,254,0.2)",
		success: "#4eff88",
		successBg: "rgba(78,255,136,0.1)",
	},
};
