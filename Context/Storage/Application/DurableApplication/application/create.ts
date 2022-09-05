import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<model.Application | gracely.Error> {
	let result: model.Application | gracely.Error
	const application: model.Application.Creatable | any = await request.body
	const current = await context.state.storage.get<model.Application>("data")
	if (!model.Application.Creatable.is(application))
		result = gracely.client.malformedContent(
			"Application.Creatable",
			"Application.Creatable",
			"A valid Application.Creatable object is required to create a new application."
		)
	else if (!request.parameter.id)
		result = gracely.client.malformedContent(
			"id",
			"string",
			"The id of the application must be sent to the durable object."
		)
	else if (current)
		result = gracely.client.malformedContent("id", "string", "Application with this id already exists.")
	else
		await context.state.storage.put<model.Application>(
			"data",
			(result = {
				...application,
				id: request.parameter.id,
				modified: isoly.DateTime.now(),
				created: isoly.DateTime.now(),
			})
		)

	return result
}

router.add("POST", "/application/:id", create)
