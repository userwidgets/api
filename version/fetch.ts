import { Signer } from "cryptly"
import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../Context"
import * as data from "../package.json"
import { router } from "../router"
export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let publicKey: string
	if (context.environment.publicKey && context.environment.privateKey) {
		const signer = Signer.create("RSA", "SHA-256", context.environment.publicKey, context.environment.privateKey)
		if (await signer.verify("abc", await signer.sign("abc"))) {
			publicKey = context.environment.publicKey
			if ((request.search.keyFormat ?? "").toLowerCase() == "pem") {
				publicKey =
					"-----BEGIN PUBLIC KEY-----" + publicKey /*.replace(/(.{64})/g, "$1\n")*/ + "-----END PUBLIC KEY-----"
			}
		} else {
			publicKey = "Misconfiguration: public- and privatekey mismatch."
		}
	} else {
		publicKey = "Misconfiguration: public- and/or privatekey is missing in environment."
	}

	const result: Record<string, any> = {
		name: data.name,
		version: data.version,
		publicKey,
	}
	if (
		!gracely.Error.is(context.authenticator) &&
		(await context.authenticator.authenticate(request, "admin")) == "admin"
	) {
		// TODO: Corrupt secrets:
		result.environment = context.environment
		result.dependencies = data.dependencies
	}

	return result
}
router.add("GET", "/version", fetch)
