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
	if (gracely.Error.is(context.applications))
		result = context.applications
	else
		result = await context.applications.update() // TODO check permissions
	return result
}

router.add("PATCH", "/application", update)
