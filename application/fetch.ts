import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.Application | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else
		result = await context.applications.fetch(credentials == "admin" ? undefined : credentials.permissions)
	return result
}

router.add("GET", "/application", fetch)
