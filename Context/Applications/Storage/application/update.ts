import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(
	request: http.Request,
	context: Context
): Promise<userwidgets.Application | gracely.Error> {
	// TODO implement
	let result: userwidgets.Application | gracely.Error
	const body: unknown = await request.body
	const application = userwidgets.Application.Changeable.type.get(body)
	if (!application)
		result = gracely.client.flawedContent(userwidgets.Application.Changeable.flaw(body))
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/application/:id", "id", "string", "the application id")
	else
		result = (await context.applications.update(application)) ?? gracely.client.notFound()
	return result
}

router.add("PATCH", "/application/:id", update)
