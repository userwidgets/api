import { cryptly } from "cryptly"
import { Password } from "./Password"

export namespace twoFactor {
	export async function check(key: string, input: string | undefined): Promise<boolean> {
		return (
			(await cryptly.authenticator.generate(key, new Date().getTime())) == input ||
			(await cryptly.authenticator.generate(key, new Date().getTime() - 30000)) == input
		)
	}
	export async function hash(
		backupCodes: string[] | undefined,
		secret: string
	): Promise<cryptly.Password.Hash[] | undefined> {
		return backupCodes && (await Promise.all(backupCodes.map(c => Password.hash(c, secret))))
	}
	export async function useBackupCode(
		code: string,
		backupCodes: cryptly.Password.Hash[],
		secret: string
	): Promise<cryptly.Password.Hash[] | undefined> {
		let result: cryptly.Password.Hash[] | undefined
		for (let index = 0; index < backupCodes.length; index++)
			if (await Password.verify(code, backupCodes[index], secret)) {
				result = backupCodes.slice(0, index).concat(...backupCodes.slice(index + 1, backupCodes.length))
				break
			}
		return result
	}
}
