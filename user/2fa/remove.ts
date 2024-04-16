import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.User | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	if (!request.parameter.email)
		result = result = gracely.client.invalidPathArgument(
			"/user/:email/2fa",
			"email",
			"string",
			"email missing from path."
		)
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (
		!userwidgets.User.Permissions.organizations(credentials.permissions).every(id =>
			userwidgets.User.Permissions.check(credentials.permissions, id, "user.admin")
		)
	)
		result = gracely.client.unauthorized()
	else
		result = await context.users.remove2fa(request.parameter.email)
	return result
}
router.add("DELETE", "/user/:email/2fa", remove)
