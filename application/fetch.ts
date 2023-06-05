import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Application | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (credentials == "admin")
		result = await context.applications.fetch()
	else
		(result = await context.applications.fetch()) &&
			!gracely.Error.is(result) &&
			!credentials.permissions["*"]?.application?.read &&
			((result.permissions = []),
			(result.organizations = Object.fromEntries(
				Object.entries(result.organizations).filter(([id, _]) => credentials.permissions[id])
			)))
	return result
}

router.add("GET", "/application", fetch)
