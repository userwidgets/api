import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.Organization
	const organization: model.Organization.Creatable | any = await request.body
	const key = context.authenticator.authenticate(request, "token", "admin")
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (!key)
		result = gracely.client.unauthorized()
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header required for this operation.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Application header should be a single value.")
	else
		result = await context.storage.application.createOrganization(request.header.application, organization)
	return result
}
router.add("POST", "/api/organization", create)
