// Configuração da Andressa ❤️
window.APP_CONFIG = {
	settings: {
		title: "Protocolo Gostosa 2.0",
		headerName: "Treino do Mozão",
		version: "v20",
	},
	theme: {
		"bg-color": "#0f0a0c",
		"card-bg": "rgba(255, 255, 255, 0.03)",
		"card-border": "rgba(255, 255, 255, 0.08)",
		"accent-color": "#a78bfa",
		"accent-glow": "rgba(167, 139, 250, 0.3)",
		"accent-soft": "rgba(167, 139, 250, 0.06)",
		"accent-mute": "rgba(167, 139, 250, 0.2)",
		"text-primary": "#ffffff",
		"text-secondary": "#a1a1aa",
		"text-muted": "#71717a",
		success: "#34d399",
		"success-bg": "rgba(52, 211, 153, 0.1)",
		danger: "#ff4e4e",
	},
	workoutData: {
		DOM: {
			title: "DOMINGO — DESCANSO",
			exercises: [],
			rest: true,
		},
		SEG: {
			title: "SEGUNDA — GLÚTEO & POSTERIOR",
			exercises: [
				// Simples: 1 peso fixo para todas as séries
				{
					name: "Elevação Pélvica (Barra)",
					sets: "4x10",
					rest: "90s",
				},
				// Pirâmide decrescente de reps (carga cresce)
				{
					name: "Agachamento Sumô",
					sets: "4 séries",
					rest: "90s",
					series: [
						{ reps: 12 },
						{ reps: 10 },
						{ reps: 8 },
						{ reps: 6 },
					],
				},
				// Pirâmide mista (reps variam, comum em hipertrofia)
				{
					name: "Cadeira Flexora",
					sets: "4 séries",
					rest: "60s",
					series: [
						{ reps: 12 },
						{ reps: 10 },
						{ reps: 10 },
						{ reps: 8 },
					],
				},
				// Simples com drop set no final (nota apenas)
				{
					name: "Glúteo na Polia",
					sets: "3x15 cada",
					rest: "60s",
					note: "Última série: drop set -30%",
				},
			],
		},
		TER: {
			title: "TERÇA — SUPERIORES",
			exercises: [
				// Simples padrão
				{
					name: "Puxada Aberta",
					sets: "3x12",
					rest: "60s",
				},
				// Pirâmide decrescente (força + volume)
				{
					name: "Remada Baixa",
					sets: "4 séries",
					rest: "90s",
					series: [
						{ reps: 10 },
						{ reps: 8 },
						{ reps: 8 },
						{ reps: 6 },
					],
				},
				// Simples (exercício de isolamento)
				{
					name: "Elevação Lateral",
					sets: "3x15",
					rest: "45s",
				},
				// Simples com superset
				{
					name: "Tríceps Corda",
					sets: "3x12",
					rest: "60s",
					note: "superset ↓",
				},
				{
					name: "Rosca Direta",
					sets: "3x12",
					rest: "90s após superset",
				},
			],
		},
		QUA: {
			title: "QUARTA — DESCANSO OU CARDIO",
			exercises: [],
			rest: true,
			extra: "🚶‍♀️ Caminhada leve ou alongamento",
		},
		QUI: {
			title: "QUINTA — QUADRÍCEPS & PANTURRILHA",
			exercises: [
				// Pirâmide clássica (força)
				{
					name: "Leg Press 45",
					sets: "4 séries",
					rest: "2min",
					series: [
						{ reps: 12 },
						{ reps: 10 },
						{ reps: 8 },
						{ reps: 6 },
					],
				},
				// Simples
				{
					name: "Cadeira Extensora",
					sets: "3x12",
					rest: "60s",
				},
				// Pirâmide mista (volume de quadríceps)
				{
					name: "Afundo com Halteres",
					sets: "4 séries",
					rest: "90s",
					series: [
						{ reps: 12 },
						{ reps: 10 },
						{ reps: 10 },
						{ reps: 8 },
					],
				},
				// Simples isolamento
				{
					name: "Panturrilha em Pé",
					sets: "4x20",
					rest: "45s",
				},
			],
		},
		SEX: {
			title: "SEXTA — FULL BODY",
			exercises: [
				// Simples com descanso curto
				{
					name: "Agachamento Livre",
					sets: "3x15",
					rest: "60s",
				},
				// Simples bodyweight
				{
					name: "Flexão de Braço",
					sets: "3x10",
					rest: "60s",
				},
				// Isometria (peso não varia — mas registra o tempo)
				{
					name: "Prancha",
					sets: "3x45s",
					rest: "30s",
					note: "Registre o peso corporal ou 0",
				},
			],
		},
		SAB: {
			title: "SÁBADO — DESCANSO",
			exercises: [],
			rest: true,
		},
	},
};
