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
	const invite = gracely.Error.is(context.tager)
		? context.tager
		: await context.tager.verify(
				request.parameter.invite?.split(".").length == 2 ? request.parameter.invite + "." : request.parameter.invite
		  )
	if (gracely.Error.is(invite))
		result = invite
	else if (gracely.Error.is(issuer))
		result = issuer
	else if (gracely.Error.is(key))
		result = key
	else if (!key || !invite || key.email != invite.email)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.users))
		result = context.users
	else {
		const response = await context.users.update(invite)
		result = gracely.Error.is(response)
			? response
			: (await issuer.sign(response)) ?? gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("PATCH", "/me/:invite", update)
