import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Organization[] | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else
		result =
			(result = await context.applications.listOrganizations(Object.keys(key.permissions))) &&
			key.permissions["*"]?.organization?.read
				? result
				: gracely.Error.is(result)
				? result
				: (result = result.map(
						organization => (
							(organization.permissions = organization.permissions.filter(name => {
								const permission = key.permissions[organization.id]
								return (
									(permission && (permission[name]?.read || permission[name]?.write)) ||
									(key.permissions["*"] && (key.permissions["*"][name]?.read || key.permissions["*"][name]?.write))
								)
							})),
							!key.permissions["*"]?.user?.read ||
								(!key.permissions[organization.id] && (organization.users = [key.email])),
							organization
						)
				  ))
	return result
}

router.add("GET", "/organization", fetch)
