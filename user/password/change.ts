import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const passwords: model.User.Password.Change | any = await request.body
	const entityTag = request.header.ifMatch?.at(0)

	if (!entityTag)
		result = gracely.client.malformedContent("If-Match", "string", "If-Match header must contain an entity invite.")
	else if (!isoly.DateTime.is(entityTag) && entityTag != "*")
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument("/user/:email", "email", "string", "Email address of valid user.")
	else if (!model.User.Password.Change.is(passwords))
		result = gracely.client.malformedContent(
			"User.Password.Change",
			"User.Password.Change",
			"A User.Password.Change object is required to change a users password."
		)
	else if (!model.User.Password.Change.validate(passwords))
		result = gracely.client.malformedContent(
			" User.Password.Change",
			"User.Password.Change",
			"A valid User.Password.Change object is required to change a users password"
		)
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!credentials)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (credentials.email != request.parameter.email)
		result = gracely.client.unauthorized("Cant change password on another user.")
	else if (isoly.DateTime.epoch(isoly.DateTime.now()) - isoly.DateTime.epoch(credentials.issued) > 15 * 60)
		result = gracely.client.unauthorized("Session to close to expiring to change password.")
	else
		result = await context.users.changePassword(credentials.email, passwords, entityTag)
	return result
}
router.add("PUT", "/user/:email/password", change)
