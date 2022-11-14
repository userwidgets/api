import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../../Context"
import { router } from "../../router"

export async function update(request: http.Request, context: Context): Promise<model.User | gracely.Error> {
	let result: model.User | gracely.Error
	const current = await context.state.storage.get<model.User>("data")
	const entityTag = request.header.ifMatch?.at(0)
	const permissions: unknown = await request.body
	if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/user/permission/:organization",
			"organization",
			"string",
			"organization"
		)
	else if (!current)
		result = gracely.client.notFound()
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (!isoly.DateTime.is(entityTag) && entityTag != "*")
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (entityTag != current.modified && entityTag != "*")
		result = gracely.client.entityTagMismatch("Requested user have already changed.")
	else if (!model.User.Permissions.Readable.is(permissions))
		result = gracely.client.malformedContent(
			"User.Permissions.Readable",
			"User.Permissions.Readable",
			"A valid User.Permissions.Readable is required to update the permissions of a user."
		)
	else if (!request.header.application)
		result = gracely.client.missingHeader("application", "Missing 'application' header in the request.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("application", "Expected only a single value in the 'application' header.")
	else {
		const readable: model.User.Permissions.Readable | undefined = current.permissions[request.header.application]
		await context.state.storage.put<model.User>(
			"data",
			(result = {
				...current,
				modified: isoly.DateTime.now(),
				permissions: {
					...current.permissions,
					...(readable && {
						[request.parameter.organizationId]: model.User.Permissions.Readable.update(readable, permissions),
					}),
				},
			})
		)
	}
	return result
}

router.add("PATCH", "/user/permission/:organizationId", update)
