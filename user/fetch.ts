import * as gracely from "gracely"
import * as model from "@userwidgets/model"
// import * as authly from "authly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const key = await context.authenticator.authenticate(request, "token", "admin")
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized()
	else if (request.header.Application)
		result = gracely.client.missingHeader("Application", "Must include Application for this resource.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "expected Application value to be a string.")
	else if (key == "admin" || key.email != request.parameter.email) {
		const user = await context.storage.user.fetch(request.parameter.email)
		result = !model.User.is(user)
			? user
			: key == "admin" ||
			  (key.audience != request.header.application &&
					user.permissions[key.audience] &&
					(key.permissions["*"].user.read ||
						Object.keys(user.permissions[key.audience] as Record<string, model.Organization | undefined>).some(
							organizationId => key.permissions[organizationId]?.user.read
						)))
			? gracely.client.unauthorized("Missing privileges to preform actions on this user.")
			: await context.storage.user.fetch(request.parameter.email)
	} else
		result = await context.storage.user.fetch(key.email)
	return result
}

router.add("GET", "/user/:email", fetch)
