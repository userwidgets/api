// import * as gracely from "gracely"
// import * as model from "@userwidgets/model"
// import * as http from "cloudly-http"
// import { Context } from "../../Context"
// import { router } from "../../router"

// export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
// 	let result: model.User | gracely.Error
// 	const key = await context.authenticator.authenticate(request, "token")
// 	const name: string | any = await request.body
// 	if (gracely.Error.is(context.storage.application))
// 		result = context.storage.application
// 	else if (!request.parameter.id)
// 		result = gracely.client.invalidPathArgument(
// 			"/api/application/:id/name",
// 			"id",
// 			"string",
// 			"URL parameter id is required for this endpoint."
// 			)
// 	else if (typeof name == "string")
// 		result = gracely.client.invalidContent("string", "name must be a string")
// 	else if (!request.header.application)
// 		result = gracely.client.missingHeader("Application", "Application header required for this operation.")
// 	else if (typeof request.header.application != "string")
// 		result = gracely.client.malformedHeader("Application", "Application header should be a single value.")
// 	else if (!key || key.audience != request.header.application || key.permissions["*"] != "*")
// 		result = gracely.client.unauthorized()
// 	else if (key.audience != request.header.application || )
// 	return result
// }

// router.add("PUT", "/api/application/:id/name", change)
