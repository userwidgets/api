import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<string[] | gracely.Error> {
	let result: gracely.Error | string[]
	const users: string[] | any = await request.body
	const application = await context.state.storage.get<model.Application>("data")
	if (!application)
		result = gracely.client.notFound()
	else if (!model.Application.is(application))
		result = gracely.client.invalidContent("model.Organization", "The requested organization is invalid.")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/user/:organizationId",
			"organizationId",
			"string",
			"organizationId is missing"
		)
	else if (!createIsArrayOf((value): value is string => typeof value == "string")(users))
		result = gracely.client.malformedContent("string[]", "string[]", "string[] where malformed")
	else {
		const existing = new Set(application.organizations[request.parameter.organizationId].users)
		const missing = users.filter(user => !existing.has(user))
		application.organizations[request.parameter.organizationId].users.push(...(result = missing))
		await context.state.storage.put("data", application)
	}
	return result
}

router.add("PATCH", "/organization/user/:organizationId", update)

function createIsArrayOf<T>(is: (value: any | T) => value is T): (value: any | T[]) => value is T[] {
	return (value): value is T[] => Array.isArray(value) && value.every(is)
}
