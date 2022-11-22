import * as gracely from "gracely"
import * as authly from "authly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	const tag = gracely.Error.is(context.tager.verifier)
		? context.tager.verifier
		: await context.tager.verifier.verify(
				request.parameter.tag?.split(".").length == 2 ? request.parameter.tag + "." : request.parameter.tag
		  )
	if (gracely.Error.is(tag))
		result = tag
	else if (gracely.Error.is(key))
		result = key
	else if (!key || !tag || key.email != tag.email)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else {
		const response = await context.storage.user.update(tag)
		const issuer = context.authenticator.createIssuer(tag.audience)
		result = gracely.Error.is(response)
			? response
			: gracely.Error.is(issuer)
			? issuer
			: (await issuer.sign(response)) ?? gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("PATCH", "/me/:tag", update)
