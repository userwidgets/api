import * as gracely from "gracely"
// import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | string[]
	const users: string[] | any = await request.body
	const key = await context.authenticator.authenticate(request, "token")
	let href: string | undefined

	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!href)
		result = gracely.client.invalidQueryArgument("url", "string", "Invalid url")
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header required for this operation")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Application header should be a string")
	else if (!createIsArrayOf((value): value is string => typeof value == "string")(users))
		result = gracely.client.invalidContent("model.User[]", "Request body invalid")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/user/:organizationId",
			"organizationId",
			"string",
			"variable missing from url"
		)
	else if (!key.permissions["*"]?.user?.write && !key.permissions[request.parameter.organizationId]?.user?.write) {
		result = gracely.client.unauthorized()
	} else {
		result = await context.storage.application.updateOrganization(key.audience, request.parameter.organizationId, users) //need to implement in index.ts
	}
	return result
}

router.add("PATCH", "/organization/user/:organizationId", update)

function createIsArrayOf<T>(is: (value: any | T) => value is T): (value: any | T[]) => value is T[] {
	return (value): value is T[] => Array.isArray(value) && value.every(is)
}
