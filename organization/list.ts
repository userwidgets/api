import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.Organization[] | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else
		result =
			(result = await context.applications.listOrganizations(Object.keys(credentials.permissions))) &&
			credentials.permissions["*"]?.organization?.read
				? result
				: gracely.Error.is(result)
				? result
				: (result = result.map(
						organization => (
							(organization.permissions = organization.permissions.filter(name => {
								const permission = credentials.permissions[organization.id]
								return (
									(permission && (permission[name]?.read || permission[name]?.write)) ||
									(credentials.permissions["*"] &&
										(credentials.permissions["*"][name]?.read || credentials.permissions["*"][name]?.write))
								)
							})),
							!credentials.permissions["*"]?.user?.read ||
								(!credentials.permissions[organization.id] && (organization.users = [credentials.email])),
							organization
						)
				  ))
	return result
}

router.add("GET", "/organization", fetch)
