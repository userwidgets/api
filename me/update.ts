import * as gracely from "gracely"
import * as authly from "authly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const { key, issuer } = gracely.Error.is(context.authenticator)
		? { key: context.authenticator, issuer: context.authenticator }
		: { key: await context.authenticator.authenticate(request, "token"), issuer: context.authenticator.issuer }
	const tag = gracely.Error.is(context.tager)
		? context.tager
		: await context.tager.verify(
				request.parameter.tag?.split(".").length == 2 ? request.parameter.tag + "." : request.parameter.tag
		  )
	if (gracely.Error.is(tag))
		result = tag
	else if (gracely.Error.is(issuer))
		result = issuer
	else if (gracely.Error.is(key))
		result = key
	else if (!key || !tag || key.email != tag.email)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.users))
		result = context.users
	else {
		const response = await context.users.update(tag)
		result = gracely.Error.is(response)
			? response
			: (await issuer.sign(response)) ?? gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("PATCH", "/me/:tag", update)
