import { useEffect, useState } from "react";
import { getAllLoadsForExercise } from "../../lib/queries/loads";
import type { LoadLog } from "../../types";

interface Props {
	userId: string;
	exerciseId: number;
	exerciseName: string;
}

export function EvolutionChart({ userId, exerciseId, exerciseName }: Props) {
	const [logs, setLogs] = useState<LoadLog[]>([]);

	useEffect(() => {
		getAllLoadsForExercise(userId, exerciseId).then(setLogs);
	}, [userId, exerciseId]);

	if (logs.length < 2) return null;

	const last5 = logs.slice(-5);
	const getRef = (log: LoadLog) =>
		log.sets.length === 0
			? 0
			: Math.round(
					log.sets.reduce((s, set) => s + set.weight, 0) / log.sets.length,
				);
	const getLabel = (log: LoadLog) => `${getRef(log)} kg`;
	const maxVal = Math.max(...last5.map(getRef), 1);

	return (
		<div className="mb-6">
			<p
				className="text-[0.9rem] font-semibold text-center mb-3"
				style={{ color: "var(--text-secondary)" }}
			>
				{exerciseName}
			</p>
			<div
				className="flex items-end justify-center gap-[0.6rem] pb-1"
				style={{ height: 54 }}
			>
				{last5.map((log, i) => {
					const ref = getRef(log);
					const h = Math.max(4, Math.round((ref / maxVal) * 38));
					return (
						<div
							key={log.id}
							className="flex flex-col items-center gap-[0.2rem] flex-1 max-w-8"
						>
							<div
								className="w-full rounded-t-xs transition-all"
								style={{
									height: h,
									background: "var(--accent-color)",
									opacity: i === last5.length - 1 ? 1 : 0.4,
								}}
							/>
							<span
								className="text-[0.75rem] whitespace-nowrap font-bold"
								style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
							>
								{getLabel(log)}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
