import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User.Readable | gracely.Error
	const key = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const email = request.parameter.email
	const name = await request.body
	const entityTag = request.header.ifMatch?.at(0)
	if (!email)
		result = gracely.client.invalidPathArgument(
			"/user/:email",
			"email",
			"string",
			"Required URL parameter email is missing from the URL."
		)
	else if (!model.User.Name.is(name))
		result = gracely.client.malformedContent(
			"User.NameChange",
			"User.NameChange",
			"A valid User.NameChange object is required to change a users name."
		)
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!entityTag)
		result = gracely.client.malformedContent("If-Match", "string", "If-Match header must contain an entity invite.")
	else if (!isoly.DateTime.is(entityTag) && entityTag != "*")
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (!key)
		result = gracely.client.unauthorized("Failed to authorize request.")
	else if (gracely.Error.is(key))
		result = key
	else if (key.email != email)
		result = result = gracely.client.unauthorized("Cant change name on another user.")
	else if (isoly.DateTime.epoch(isoly.DateTime.now()) - isoly.DateTime.epoch(key.issued) > 15 * 60)
		result = gracely.client.unauthorized("Session to close to expiring to change name.")
	else {
		result = await context.users.changeName(email, entityTag, name)
	}
	return result
}
router.add("PUT", "/user/:email/name", change)
