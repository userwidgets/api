import * as gracely from "gracely"
import * as authly from "authly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "user")

	if (gracely.Error.is(context.users))
		result = context.users
	else if (!model.User.Credentials.is(credentials))
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (gracely.Error.is(context.authenticator))
		result = context.authenticator
	else {
		const response = await context.users.authenticate(credentials)
		result = gracely.Error.is(response)
			? response
			: (await context.authenticator.sign(response)) ??
			  gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("GET", "/me", fetch)
