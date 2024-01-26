import { cryptly } from "cryptly"

export namespace twoFactor {
	export async function check(key: string, input: string | undefined): Promise<boolean> {
		return (
			(await cryptly.authenticator.generate(key, new Date().getTime())) == input ||
			(await cryptly.authenticator.generate(key, new Date().getTime() - 30000)) == input
		)
	}
}
