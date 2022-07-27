import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const key = await context.authenticator.authenticate(request, "token", "admin")
	const email = request.parameter.email
	const passwords: model.User.PasswordChange | any = await request.body
	if (!email)
		result = gracely.client.invalidPathArgument("/user/:email", "email", "string", "Email address of valid user.")
	else if (!model.User.PasswordChange.is(passwords))
		result = gracely.client.malformedContent(
			"User.PasswordChange",
			"User.PasswordChange",
			"A valid User.PasswordChange object is required to change a users password."
		)
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (key != "admin" && key.email != email) {
		const user = await context.storage.user.fetch(email)
		if (!model.User.is(user))
			result = user
		else if (
			!Object.values(user.permissions).some(organization =>
				Object.keys(organization).some(organizationId => key.permissions[organizationId] == "*")
			)
		)
			result = gracely.client.unauthorized("Missing privileges to preform actions on this user.")
		else
			result = await context.storage.user.changePassword(email, passwords)
	} else
		result = await context.storage.user.changePassword(email, passwords)
	return result
}
router.add("PUT", "/api/user/:email/password", change)
