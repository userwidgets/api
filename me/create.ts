import { flagly } from "flagly"
import { gracely } from "gracely"
import { authly } from "authly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const invite = gracely.Error.is(context.inviter)
		? context.inviter
		: await context.inviter.verify(request.parameter.invite)
	const register: userwidgets.User.Credentials.Register | any = await request.body
	if (gracely.Error.is(context.users))
		result = context.users
	else if (!invite)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(invite))
		result = invite
	else if (!userwidgets.User.Credentials.Register.is(register))
		result = gracely.client.malformedContent(
			"User.Credentials.Register",
			"User.Credentials.Register",
			"A valid User.Credentials.Register is required to register a new user."
		)
	else if (gracely.Error.is(context.authenticator))
		result = context.authenticator
	else if (register.user != invite.email)
		result = gracely.client.unauthorized()
	else {
		const response = await context.users.create({
			email: invite.email,
			password: register.password,
			name: register.name,
			permissions: flagly.Flags.stringify(invite.permissions),
		})
		result = gracely.Error.is(response)
			? response
			: (await context.authenticator.sign(userwidgets.User.Key.Creatable.from(response))) ??
			  gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("POST", "/me/:invite", create)
