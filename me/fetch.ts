import * as gracely from "gracely"
import * as authly from "authly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	const credentials = await context.authenticator.authenticate(request, "user")
	let result: authly.Token | gracely.Error
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!model.User.Credentials.is(credentials))
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Must include Application id for this resource.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Expected Application value to be a string.")
	else {
		const response = await context.storage.user.authenticate(credentials, request.header.application)
		const issuer = context.authenticator.createIssuer(request.header.application)
		result = gracely.Error.is(response)
			? response
			: (await issuer.sign(response)) ?? gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	console.log("me/fetch/result", result)
	return result
}

router.add("GET", "/me", fetch)
