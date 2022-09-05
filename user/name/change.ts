// import * as gracely from "gracely"
// import * as model from "@userwidgets/model"
// import * as http from "cloudly-http"
// import { Context } from "../../Context"
// import { router } from "../../router"

// export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
// 	let result: model.User | gracely.Error
// 	const key = await context.authenticator.authenticate(request, "token")
// 	const email = request.parameter.email
// 	const names = await request.body
// 	const entityTag = request.header.ifMatch?.shift()
// 	if (!email)
// 		result = gracely.client.invalidPathArgument(
// 			"/user/:email",
// 			"email",
// 			"string",
// 			"Required URL parameter email is missing from the URL."
// 		)
// 	else if (!model.User.Name.is(names))
// 		result = gracely.client.malformedContent(
// 			"User.NameChange",
// 			"User.NameChange",
// 			"A valid User.NameChange object is required to change a users name."
// 		)
// 	else if (gracely.Error.is(context.storage.user))
// 		result = context.storage.user
// 	else if (!entityTag)
// 		result = gracely.client.malformedContent("If-Match", "string", "If-Match header must contain an entity tag.")
// 	else if (!key)
// 		result = gracely.client.unauthorized("Failed to authorize request.")
// 	else
// 		result =
// 			(result = await context.storage.user.fetch(email)) && key.permissions["*"]?.user?.read
// 				? result
// 				: gracely.Error.is(result) || result.email == key.email
// 				? result
// 				: Object.keys(key.permissions)
// 						.filter(id => id != "*")
// 						.find(
// 							organizationId =>
// 								key.permissions[organizationId]?.user?.read &&
// 								!gracely.Error.is(result) &&
// 								organizationId in result.permissions
// 						) && key.permissions["*"]?.organization?.read
// 				? result
// 				: (result.permissions = Object.fromEntries(
// 						Object.entries(result.permissions).filter(
// 							([organizationId, _]) => organizationId != "*" && organizationId in key.permissions
// 						)
// 				  )) && result
// 	return result
// }
// router.add("PUT", "/user/:email/name", change)
