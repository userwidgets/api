export function parse(url: string | undefined | null): URL | undefined {
	let result: URL | undefined
	try {
		result = !url ? undefined : new URL(url)
	} catch (_) {
		result = undefined
	}
	return result
}
