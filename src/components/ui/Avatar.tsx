import { useState } from "react";

interface Props {
	name: string;
	url?: string;
	className: string;
}

export function Avatar({ name, url, className }: Props) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);

	if (url && url !== failedUrl) {
		return (
			<img
				src={url}
				alt={name}
				referrerPolicy="no-referrer"
				onError={() => setFailedUrl(url)}
				className={`${className} rounded-full object-cover border`}
				style={{ borderColor: "var(--accent-mute)" }}
			/>
		);
	}

	return (
		<div
			className={`${className} rounded-full flex items-center justify-center font-bold border`}
			style={{
				borderColor: "var(--accent-mute)",
				background: "var(--accent-soft)",
				color: "var(--accent-color)",
				fontFamily: "Outfit",
			}}
		>
			{name.charAt(0).toUpperCase()}
		</div>
	);
}
