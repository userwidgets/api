import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: { organization: model.Organization | gracely.Error; user?: gracely.Error } | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const entityTag = request.header.ifMatch?.at(0)

	if (gracely.Error.is(credentials))
		result = credentials
	else if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/:organizationId/user/:email",
			"organizationId",
			"string",
			"organizationId is required for this request."
		)
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument(
			"/organization/:organizationId/user/:email",
			"email",
			"string",
			"email is required for this request."
		)
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "Missing required header If-Match.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "If-Match header must be an isoly.DateTime")
	else if (!credentials)
		result = gracely.client.unauthorized()
	else {
		result = await context.applications.removeOrganizationUser(
			request.parameter.organizationId,
			request.parameter.email,
			entityTag
		)
	}
	return {
		status:
			gracely.Error.is(result) || gracely.Error.is(result.organization) || gracely.Error.is(result.user) ? 400 : 200,
		body: result,
	}
}

router.add("DELETE", "/organization/:organizationId/user/:email", remove)
