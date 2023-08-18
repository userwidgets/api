import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(
	request: http.Request,
	context: Context
): Promise<userwidgets.Application | gracely.Error> {
	let result: userwidgets.Application | gracely.Error
	const body: unknown = await request.body
	const application = userwidgets.Application.Creatable.type.get(body)
	if (!application)
		result = gracely.client.flawedContent(userwidgets.Application.Creatable.type.flaw(body))
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/application/:id", "id", "string", "the application id")
	else
		result =
			(await context.applications.create({ ...application, id: request.parameter.id })) ??
			gracely.client.invalidContent("Application", "This application already exists.")
	return result
}

router.add("POST", "/application/:id", create)
