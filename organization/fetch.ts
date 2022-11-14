import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Organization | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/:id",
			"id",
			"string",
			"organizationId must be specified in the URL."
		)
	else
		result =
			(result = await context.storage.application.fetchOrganization(key.audience, request.parameter.organizationId)) &&
			key.permissions["*"]?.organization?.read
				? result
				: gracely.Error.is(result)
				? result
				: (result.permissions = result.permissions.filter(name => {
						const permission = gracely.Error.is(result) ? undefined : key.permissions[result.id]
						return (
							(permission && (permission[name]?.read || permission[name]?.write)) ||
							(key.permissions["*"] && (key.permissions["*"][name]?.read || key.permissions["*"][name]?.write))
						)
				  })) &&
				  (result.users = [key.email]) &&
				  result
	return result
}

router.add("GET", "/organization/:organizationId", fetch)
