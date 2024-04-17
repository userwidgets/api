import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.Organization | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/organization/:id", "id", "string", "id must be specified in the URL.")
	else
		result = await context.applications.organizations.fetch(
			request.parameter.id,
			typeof credentials == "object" ? credentials.permissions : undefined
		)
	return result
}

router.add("GET", "/organization/:id", fetch)
