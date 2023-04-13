import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<model.User | gracely.Error> {
	let result: model.User | gracely.Error
	const names = await request.body
	const current = await context.state.storage.get<model.User>("data")
	const entityTag = request.header.ifMatch?.shift()
	if (!model.User.Name.is(names))
		result = gracely.client.malformedContent(
			"User.NameChange",
			"User.NameChange",
			"A valid User.NameChange object is required to change a users name."
		)
	else if (!current)
		result = gracely.client.notFound("Requested user does not exist.")
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (entityTag != "*" && entityTag < current.modified)
		result = gracely.client.entityTagMismatch("Requested user have already changed.")
	else {
		current.name.first = names.first
		current.name.last = names.last
		current.modified = isoly.DateTime.now()
		await context.state.storage.put<model.User>("data", (result = current))
	}
	return result
}

router.add("PUT", "/user/name", change)
