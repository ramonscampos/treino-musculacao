const TTL_MS = 5 * 60 * 1000;

const store = new Map<string, { at: number; value: unknown }>();
let generation = 0;

export function peekCached<T>(key: string): T | undefined {
	const entry = store.get(key);
	if (!entry || Date.now() - entry.at > TTL_MS) return undefined;
	return entry.value as T;
}

export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const hit = peekCached<T>(key);
	if (hit !== undefined) return hit;

	const startedAt = generation;
	const value = await fetcher();
	// Skip storing results that raced with a write
	if (startedAt === generation) store.set(key, { at: Date.now(), value });
	return value;
}

export function invalidateCache() {
	generation++;
	store.clear();
}
