import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User.Readable | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else if (request.header.Application)
		result = gracely.client.missingHeader("Application", "Must include Application for this resource.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "expected Application value to be a string.")
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument(
			"/user/:email",
			"email",
			"string",
			"email must be specified in the URL."
		)
	else
		result =
			(result = await context.storage.user.fetch(key.audience, request.parameter.email)) &&
			key.permissions["*"]?.user?.read
				? result
				: gracely.Error.is(result) || result.email == key.email
				? result
				: Object.keys(key.permissions)
						.filter(id => id != "*")
						.find(
							organizationId =>
								key.permissions[organizationId]?.user?.read &&
								!gracely.Error.is(result) &&
								organizationId in result.permissions
						) && key.permissions["*"]?.organization?.read
				? result
				: (result.permissions = Object.fromEntries(
						Object.entries(result.permissions).filter(
							([organizationId, _]) => organizationId != "*" && organizationId in key.permissions
						)
				  )) && result
	return result
}

router.add("GET", "/user/:email", fetch)
