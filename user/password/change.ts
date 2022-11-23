import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	const passwords: model.User.Password.Change | any = await request.body
	const entityTag = request.header.ifMatch?.at(0)
	if (!entityTag)
		result = gracely.client.malformedContent("If-Match", "string", "If-Match header must contain an entity tag.")
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
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (gracely.Error.is(key))
		result = key
	else if (key.email != request.parameter.email)
		result = gracely.client.unauthorized("Cant change password on another user.")
	else if (isoly.DateTime.epoch(isoly.DateTime.now()) - isoly.DateTime.epoch(key.issued) > 15 * 60)
		result = gracely.client.unauthorized("Token to close to expiring to change password.")
	else
		result = await context.storage.user.changePassword(key.email, passwords, entityTag)
	return result
}
router.add("PUT", "/user/:email/password", change)
