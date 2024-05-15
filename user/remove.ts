import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function remove(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.User | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	const entityTag = request.header.ifMatch?.at(0)
	if (!request.parameter.email)
		result = result = gracely.client.invalidPathArgument("/user/:email", "email", "string", "email missing from path.")
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header must contain an entity tag.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("ifMatch", "If-Match header must contain a valid entity tag.")
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!credentials)
		result = gracely.client.unauthorized()
	else
		result = await context.users.remove(request.parameter.email, entityTag)
	return result
}
router.add("DELETE", "/user/:email", remove)
