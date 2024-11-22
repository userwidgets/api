import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.Application
	const admin = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "admin")
	const body: unknown = await request.body
	const application = model.Application.Creatable.type.get(body)
	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (!application)
		result = gracely.client.flawedContent(model.Application.Creatable.flaw(body))
	else if (!admin || gracely.Error.is(admin))
		result = gracely.client.unauthorized(`Not authorized for this action on userwidgets application.`)
	else
		result = await context.applications.create(application)
	return result
}

router.add("POST", "/application", create)
