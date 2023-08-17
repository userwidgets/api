import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.User | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const body: unknown = await request.body
	const user = userwidgets.User.Changeable.type.get(body)
	const entityTag = request.header.ifMatch?.at(0)
	if (!user)
		result = gracely.client.flawedContent(userwidgets.User.Changeable.flaw(body))
	else if (!request.parameter.email)
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
	else if (
		user.password &&
		(credentials.email != request.parameter.email ||
			isoly.TimeSpan.toMinutes(isoly.DateTime.span(isoly.DateTime.now(), credentials.issued)) > 5)
	)
		result = gracely.client.unauthorized("refresh")
	else if (user.name && request.parameter.email != credentials.email)
		result = gracely.client.unauthorized("forbidden")
	else if (
		user.permissions
		// &&
		// Object.keys(user.permissions).some(
		// 	id => !userwidgets.User.Permissions.check(credentials.permissions, id, "user.admin")
		// )
	)
		// result = gracely.client.unauthorized("forbidden")
		result = gracely.server.backendFailure("changing permissions is not implemented")
	else
		result = await context.users.update(request.parameter.email, user, entityTag, credentials.permissions)
	return result
}
router.add("PATCH", "/user/:email", update)
