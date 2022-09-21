import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else {
		result =
			(result = await context.storage.user.list(
				key.audience,
				Object.keys(key.permissions).filter(id => id != "*")
			)) && key.permissions["*"]?.user?.read
				? result
				: gracely.Error.is(result)
				? result
				: (result = result.map(user =>
						Object.keys(key.permissions)
							.filter(id => id != "*")
							.find(
								organizationId => key.permissions[organizationId]?.user?.read && organizationId in user.permissions
							) && key.permissions["*"]?.organization?.read
							? user
							: (user.permissions = Object.fromEntries(
									Object.entries(user.permissions).filter(
										([organizationId, _]) => organizationId != "*" && organizationId in key.permissions
									)
							  )) && user
				  ))
	}
	return result
}

router.add("GET", "/user", list)
