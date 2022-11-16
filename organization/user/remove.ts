import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: { organization: model.Organization | gracely.Error; user?: gracely.Error } | gracely.Error
	const key = await context.authenticator.authenticate(request, "token")
	const entityTag = request.header.ifMatch?.at(0)
	if (gracely.Error.is(key))
		result = key
	else if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument("", "", "", "")
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument("", "", "", "")
	else if (!entityTag)
		result = gracely.client.missingHeader("", "")
	else if (!isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("", "")
	else if (!key)
		result = gracely.client.unauthorized()
	else {
		result = await context.storage.application.removeOrganizationUser(
			key.audience,
			request.parameter.organizationId,
			request.parameter.email,
			entityTag
		)
	}
	return result
}

router.add("DELETE", "organization/:organizationId/user/:email", remove)
