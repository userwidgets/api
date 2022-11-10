import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	const email = request.parameter.email
	const names = await request.body
	const entityTag = request.header.ifMatch?.at(0)
	if (!email)
		result = gracely.client.invalidPathArgument(
			"/user/:email",
			"email",
			"string",
			"Required URL parameter email is missing from the URL."
		)
	else if (!model.User.Name.is(names))
		result = gracely.client.malformedContent(
			"User.NameChange",
			"User.NameChange",
			"A valid User.NameChange object is required to change a users name."
		)
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!entityTag)
		result = gracely.client.malformedContent("If-Match", "string", "If-Match header must contain an entity tag.")
	else if (!key)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (gracely.Error.is(key))
		result = key
	else if (key.email != email)
		result = result = gracely.client.unauthorized("Cant change name on another user.")
	else if (key.issued > isoly.DateTime.nextMinute(isoly.DateTime.now(), -15))
		result = gracely.client.unauthorized("Token to close to expiring to change name.")
	else {
		result = await context.storage.user.changeName(email, entityTag, names)
	}
	return result
}
router.add("PUT", "/user/:email/name", change)
