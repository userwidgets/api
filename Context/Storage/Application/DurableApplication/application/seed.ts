import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function seed(request: http.Request, context: Context): Promise<model.Application | gracely.Error> {
	let result: model.Application | gracely.Error
	const application: model.Application | any = await request.body
	const current = await context.state.storage.get<model.Application>("data")
	if (!model.Application.is(application))
		result = gracely.client.malformedContent(
			"Application",
			"Application",
			"A valid Application object is required to seed a new application."
		)
	else if (current)
		result = gracely.client.malformedContent("id", "string", "Application with this id already exists.")
	else
		await context.state.storage.put<model.Application>("data", (result = application))
	return result
}

router.add("POST", "/application/seed", seed)
