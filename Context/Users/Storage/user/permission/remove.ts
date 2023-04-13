import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<model.User | gracely.Error> {
	let result: model.User | gracely.Error
	const entityTag = request.header.ifMatch?.at(0)
	const current = await context.state.storage.get<model.User>("data")
	if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/user/permission/:organizationId",
			"organizationId",
			"string",
			"organizationId is required for this request."
		)
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header is required for this request.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Only a single value for this header is allowed.")
	else if (!current)
		result = gracely.client.notFound("user not found.")
	else if (!current.permissions[request.header.application]?.[request.parameter.organizationId])
		result = gracely.client.notFound("This user is not a member of this organization.")
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (entityTag != "*" && entityTag < current.modified)
		result = gracely.client.entityTagMismatch("Requested user have already changed.")
	else {
		current.modified = isoly.DateTime.now()
		current.permissions[request.header.application] = (({ [request.parameter.organizationId]: _, ...permissions }) =>
			permissions)(current.permissions[request.header.application] ?? {})
		await context.state.storage.put<model.User>("data", current)
		result = current
	}
	return result
}

router.add("DELETE", "/user/permission/:organizationId", remove)
