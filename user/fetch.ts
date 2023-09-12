import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.User | gracely.Error
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
		result = await context.users.fetch(request.parameter.email, credentials.permissions)
	return result
}

router.add("GET", "/user/:email", fetch)
