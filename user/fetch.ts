import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User.Readable | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")

	if (gracely.Error.is(context.users))
		result = context.users
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument(
			"/user/:email",
			"email",
			"string",
			"email must be specified in the URL."
		)
	else
		result =
			(result = await context.users.fetch(request.parameter.email)) && credentials.permissions["*"]?.user?.read
				? result
				: gracely.Error.is(result) || result.email == credentials.email
				? result
				: Object.keys(credentials.permissions)
						.filter(id => id != "*")
						.find(
							organizationId =>
								credentials.permissions[organizationId]?.user?.read &&
								!gracely.Error.is(result) &&
								organizationId in result.permissions
						) && credentials.permissions["*"]?.organization?.read
				? result
				: (result.permissions = Object.fromEntries(
						Object.entries(result.permissions).filter(
							([organizationId, _]) => organizationId != "*" && organizationId in credentials.permissions
						)
				  )) && result
	return result
}

router.add("GET", "/user/:email", fetch)
