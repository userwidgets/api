import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../../Context"
import { router } from "../../router"

export async function create(request: http.Request, context: Context): Promise<model.User | gracely.Error> {
	let result: model.User | gracely.Error
	const entityTag = request.header.ifMatch?.at(0)
	const current = await context.state.storage.get<model.User>("data")
	if (!current)
		result = gracely.client.notFound("user not found.")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument("", "", "", "")
	else if (!current.permissions[request.parameter.organizationId])
		result = gracely.client.notFound("This user is not a member of this organization.")
	else if (!entityTag)
		result = gracely.client.missingHeader("", "")
	else if (!isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("", "")
	else if (entityTag != "*" || entityTag >= current.modified)
		result = gracely.client.entityTagMismatch("")
	else {
		current.modified = isoly.DateTime.now()
		current.permissions = (({ [request.parameter.organizationId]: _, ...permissions }) => permissions)(
			current.permissions
		)
		await context.state.storage.put<model.User>("data", current)
		result = current
	}
	return result
}

router.add("DELETE", "/user/permission/:organizationId", create)
