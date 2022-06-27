import * as gracely from "gracely"
// import * as authly from "authly"
import * as http from "cloudly-http"
import * as model from "../../model"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized()
	else if (request.header.Application)
		result = gracely.client.missingHeader("Application", "Must include Application for this resource.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "expected Application value to be a string.")
	else if (key.audience != request.header.application)
		result = gracely.client.unauthorized("forbidden")
	else
		result = await context.storage.user.list(
			request.header.application,
			Object.keys(key.permissions).filter(organizationId => organizationId != "*")
		)
	return result
}

router.add("GET", "api/user", list)
