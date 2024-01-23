import { cryptly } from "cryptly"
import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Context } from "../Context"
import * as data from "../package.json"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | Record<string, unknown>
	const authorization = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "admin")
	if (gracely.Error.is(authorization))
		result = authorization
	else {
		let publicKey: string
		if (context.environment.publicKey && context.environment.privateKey) {
			const signer = cryptly.Signer.create(
				"RSA",
				"SHA-256",
				context.environment.publicKey,
				context.environment.privateKey
			)
			if (await signer.verify("abc", await signer.sign("abc"))) {
				publicKey = context.environment.publicKey
				switch ((request.search.keyFormat ?? "").toLowerCase()) {
					case "pem":
						publicKey =
							"-----BEGIN PUBLIC KEY-----" + publicKey.replace(/(.{64})/g, "$1\n") + "\n-----END PUBLIC KEY-----"
						break
					case "pem-one-line":
						publicKey = "-----BEGIN PUBLIC KEY-----" + publicKey + "-----END PUBLIC KEY-----"
				}
			} else
				publicKey = "Misconfiguration: public- and privatekey mismatch."
		} else
			publicKey = "Misconfiguration: public- and/or privatekey is missing in environment."
		result = {
			name: data.name,
			version: data.version,
			publicKey,
		}
		if (authorization == "admin") {
			result.environment = {
				...context.environment,
				privateKey: context.environment.privateKey
					? context.environment.privateKey.substring(0, 10) + "..." + context.environment.privateKey.slice(-10)
					: "Missing!",
				adminSecret: context.environment.adminSecret ? "****" : "Missing!",
				hashSecret: context.environment.hashSecret ? "****" : "Missing!",
				dkimPrivateKey: context.environment.dkimPrivateKey
					? context.environment.dkimPrivateKey.substring(0, 10) + "..." + context.environment.dkimPrivateKey.slice(-10)
					: "Missing!",
			}
			result.dependencies = data.dependencies
		}
	}
	return result
}
router.add("GET", "/version", fetch)
