import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<model.Organization | gracely.Error> {
	let result: model.Organization | gracely.Error
	const entityTag = request.header.ifMatch?.at(0)
	const current = await context.state.storage.get<model.Application>("data")
	if (!current)
		result = gracely.client.notFound("application not found.")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument("", "", "", "")
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument("", "", "", "")
	else if (!request.header.application)
		result = gracely.client.missingHeader("", "")
	else if (!entityTag)
		result = gracely.client.missingHeader("", "")
	else if (!isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("", "")
	else if (!current.organizations[request.parameter.organizationId])
		result = gracely.client.notFound("Organization does not exist on this application.")
	else if (entityTag != "*" || entityTag >= current.organizations[request.parameter.organizationId].modified)
		result = gracely.client.entityTagMismatch("")
	else if (!current.organizations[request.parameter.organizationId].users.includes(request.parameter.email))
		result = gracely.client.notFound("User is not a member of the organization.")
	else {
		current.organizations[request.parameter.organizationId].users = current.organizations[
			request.parameter.organizationId
		].users.filter(user => user != request.parameter.email)
		current.organizations[request.parameter.organizationId].modified = isoly.DateTime.now()
		result = current.organizations[request.parameter.organizationId]
		await context.state.storage.put<model.Application>("data", current)
	}
	return result
}

router.add("DELETE", "/organization/:organizationId/user/:email", remove)
