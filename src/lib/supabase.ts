import { createClient } from "@supabase/supabase-js";
import { invalidateCache } from "./queryCache";

function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

// Any database write invalidates cached reads, before and after it lands.
const fetchWithInvalidation: typeof fetch = (input, init) => {
	const method = (
		init?.method ?? (input instanceof Request ? input.method : "GET")
	).toUpperCase();
	const isWrite = method !== "GET" && method !== "HEAD";
	if (!isWrite || !requestUrl(input).includes("/rest/v1/")) {
		return fetch(input, init);
	}
	invalidateCache();
	return fetch(input, init).finally(invalidateCache);
};

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL as string,
	import.meta.env.VITE_SUPABASE_ANON_KEY as string,
	{ global: { fetch: fetchWithInvalidation } },
);
