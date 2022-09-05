import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Organization[] | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!key)
		result = gracely.client.unauthorized()
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Must include Application for this resource.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "expected Application value to be a string.")
	else if (key.audience != request.header.application)
		result = gracely.client.unauthorized()
	else
		result =
			(result = await context.storage.application.listOrganizations(
				request.header.application,
				Object.keys(key.permissions)
			)) && key.permissions["*"]?.organization?.read
				? result
				: gracely.Error.is(result)
				? result
				: (result = result.map(
						organization =>
							(organization.permissions = organization.permissions.filter(name => {
								const permission = key.permissions[organization.id]
								return permission && (name in permission || (key.permissions["*"] && name in key.permissions["*"]))
							})) &&
							(organization.users = [key.email]) &&
							organization
				  ))
	return result
}

router.add("GET", "/organization", fetch)
