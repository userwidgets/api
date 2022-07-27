import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User | gracely.Error
	const key = await context.authenticator.authenticate(request, "token", "admin")
	const email = request.parameter.email
	const names = await request.body
	const entityTag = request.header.ifMatch?.shift()
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
	else if (key == "admin" || key.email != email) {
		const user = await context.storage.user.fetch(email)
		result = !model.User.is(user)
			? user
			: key == "admin" ||
			  !Object.keys(user.permissions[key.audience])
					.filter(orgId => Object.keys(key.permissions).includes(orgId))
					.some(orgId => key.permissions[orgId] == "*")
			? gracely.client.unauthorized("Missing privileges to preform actions on this user.")
			: await context.storage.user.changeName(email, entityTag, names)
	} else
		result = await context.storage.user.changeName(email, entityTag, names)
	return result
}
router.add("PUT", "/api/user/:email/name", change)
