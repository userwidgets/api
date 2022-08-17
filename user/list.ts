import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User[] | gracely.Error
	let application: string | undefined | string[]
	const key = await context.authenticator.authenticate(request, "token", "admin")
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!key)
		result = gracely.client.unauthorized()
	else if (
		!(application = request.header.application ?? (key != undefined && key != "admin" ? key.audience : undefined))
	)
		result = gracely.client.missingHeader("Application", "Must include Application for this resource.")
	else if (typeof application != "string")
		result = gracely.client.malformedHeader("Application", "expected Application value to be a string.")
	else
		result =
			key != "admin" && key.audience != application
				? gracely.client.unauthorized("forbidden")
				: key == "admin" || key.permissions["*"].user.read
				? request.search.organizationId
					? await context.storage.user.list(application, [request.search.organizationId])
					: await context.storage.user.list(application)
				: request.search.organizationId && key.permissions[request.search.organizationId]?.user?.read
				? await context.storage.user.list(application, [request.search.organizationId])
				: await context.storage.user.list(
						application,
						Object.entries(key.permissions).reduce((organizationIds, [organizationId, organization]) => {
							if (organizationId != "*" && organization?.user.read)
								organizationIds.push(organizationId)
							return organizationIds
						}, [] as string[])
				  )
	return result
}

router.add("GET", "/user", list)
