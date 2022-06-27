import * as cryptly from "cryptly"
import * as gracely from "gracely"

export async function hash(password: string, hashSecret?: string): Promise<cryptly.Password.Hash | gracely.Error> {
	let result: cryptly.Password.Hash | gracely.Error
	if (!hashSecret)
		result = gracely.server.misconfigured("hashSecret", "hashSecret is not set in worker environment")
	else
		result = await cryptly.Password.hash(
			cryptly.Signer.create("HMAC", "SHA-512", hashSecret),
			password,
			cryptly.RandomValue.generate(new Uint8Array(64)).toString()
		)
	return result
}

export async function verify(
	password: string,
	hash: cryptly.Password.Hash,
	hashSecret?: string
): Promise<boolean | gracely.Error> {
	return hashSecret
		? await cryptly.Password.verify(cryptly.Signer.create("HMAC", "SHA-512", hashSecret), hash, password)
		: gracely.server.misconfigured("hashSecret", "hashSecret is not set in worker environment")
}
