import * as gracely from "gracely"
import * as authly from "authly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	const tag = gracely.Error.is(context.tager.verifier)
		? context.tager.verifier
		: await context.tager.verifier.verify(request.parameter.tag)
	const register: model.User.Credentials.Register | any = await request.body
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!tag)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(tag))
		result = tag
	else if (!model.User.Credentials.Register.is(register))
		result = gracely.client.malformedContent(
			"User.Credentials.Register",
			"User.Credentials.Register",
			"A valid User.Credentials.Register is required to register a new user."
		)
	else if (register.user != tag.email)
		result = gracely.client.unauthorized()
	else {
		const response = await context.storage.user.create(tag.audience, {
			email: tag.email,
			password: register.password,
			name: register.name,
			permissions: tag.permissions,
		})
		const issuer = context.authenticator.createIssuer(tag.audience)
		result = gracely.Error.is(issuer)
			? issuer
			: gracely.Error.is(response)
			? response
			: (await issuer.sign(response)) ?? gracely.server.misconfigured("issuer | privateKey", "Failed to sign token.")
	}
	return result
}

router.add("POST", "/me/:tag", create)
