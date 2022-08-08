import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const key = await context.authenticator.authenticate(request, "token", "admin")
	const passwords: model.User.Password.Change | any = await request.body
	if (!request.parameter.email)
		result = gracely.client.invalidPathArgument("/user/:email", "email", "string", "Email address of valid user.")
	else if (!model.User.Password.Change.is(passwords))
		result = gracely.client.malformedContent(
			"User.Password.Change",
			"User.Password.Change",
			"A valid User.Password.Change object is required to change a users password."
		)
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (key == "admin" || key.email != request.parameter.email) {
		const user = await context.storage.user.fetch(request.parameter.email)
		result = !model.User.is(user)
			? user
			: key == "admin" ||
			  (key.audience != request.header.application &&
					user.permissions[key.audience] &&
					(key.permissions["*"].user.write ||
						Object.keys(user.permissions[key.audience] as Record<string, model.Organization | undefined>).some(
							organizationId => key.permissions[organizationId]?.user.write
						)))
			? gracely.client.unauthorized("Missing privileges to preform actions on this user.")
			: await context.storage.user.changePassword(request.parameter.email, passwords)
	} else
		result = await context.storage.user.changePassword(key.email, passwords)
	return result
}
router.add("PUT", "/user/:email/password", change)
