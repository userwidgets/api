import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	// TODO implement
	let result: userwidgets.Application | gracely.Error
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	const body: unknown = await request.body
	const application = userwidgets.Application.Changeable.type.get(body)
	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!application)
		result = gracely.client.flawedContent(userwidgets.Application.Changeable.flaw(body))
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!context.referer)
		result = gracely.client.missingHeader("Referer", "Referer required.")
	else if (
		credentials != "admin" &&
		!userwidgets.User.Permissions.check(credentials.permissions, context.referer, "app.edit")
	)
		result = gracely.client.unauthorized("forbidden")
	else
		result = await context.applications.update(application)
	return result
}

router.add("PATCH", "/application", update)
