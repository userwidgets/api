import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.User.Readable[] | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")

	if (gracely.Error.is(context.users))
		result = context.users
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else
		result = await context.users.list(credentials.permissions)
	return result
}

router.add("GET", "/user", list)
