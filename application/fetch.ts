import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Application | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!key)
		result = gracely.client.unauthorized()
	else
		(result = await context.storage.application.fetch(key.audience)) &&
			!gracely.Error.is(result) &&
			!key.permissions["*"]?.application?.read &&
			key.permissions["*"] &&
			(result.permissions = result.permissions.filter(name => key.permissions["*"] && name in key.permissions["*"])) &&
			(result.organizations = Object.fromEntries(
				Object.entries(result.organizations).filter(([id, _]) => id in key.permissions)
			))

	return result
}

router.add("GET", "/application", fetch)
