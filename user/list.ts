import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User.Readable[] | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	if (gracely.Error.is(context.users))
		result = context.users
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else {
		const response = await context.users.list(Object.keys((({ "*": app, ...org }) => org)(key.permissions)))
		result = gracely.Error.is(response)
			? response
			: key.permissions["*"]?.user?.read
			? response
			: response.map(user =>
					Object.keys((({ "*": app, ...org }) => org)(key.permissions)).find(
						organizationId => key.permissions[organizationId]?.user?.read && organizationId in user.permissions
					) && key.permissions["*"]?.organization?.read
						? user
						: (user.permissions = Object.fromEntries(
								Object.entries(user.permissions).filter(
									([organizationId, _]) => organizationId != "*" && organizationId in key.permissions
								)
						  )) && user
			  )
	}
	return result
}

router.add("GET", "/user", list)
