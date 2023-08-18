import { cryptly } from "cryptly"

export type Password = string
export namespace Password {
	export type Hash = cryptly.Password.Hash
	export async function hash(password: string, secret: string): Promise<Hash> {
		return await cryptly.Password.hash(
			cryptly.Signer.create("HMAC", "SHA-512", secret),
			password,
			cryptly.RandomValue.generate(new Uint8Array(64)).toString()
		)
	}
	export async function verify(password: Password, hash: Hash, secret: string): Promise<boolean> {
		return cryptly.Password.verify(cryptly.Signer.create("HMAC", "SHA-512", secret), hash, password)
	}
}
