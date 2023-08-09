import { gracely } from "gracely"
import { authly } from "authly"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const invite = gracely.Error.is(context.inviter)
		? context.inviter
		: await context.inviter.verify(
				request.parameter.invite?.split(".").length == 2 ? request.parameter.invite + "." : request.parameter.invite
		  )

	if (gracely.Error.is(invite))
		result = invite
	else if (gracely.Error.is(context.authenticator))
		result = context.authenticator
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!credentials || !invite || credentials.email != invite.email)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.users))
		result = context.users
	else {
		const response = await context.users.join(invite)
		result = gracely.Error.is(response)
			? response
			: (await context.authenticator.sign(response)) ??
			  gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("PATCH", "/me/:invite", update)
