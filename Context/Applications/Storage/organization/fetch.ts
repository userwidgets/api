import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<model.Organization | gracely.Error> {
	let result: model.Organization | gracely.Error
	if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/organization:id", "id", "string", "id required for this endpoint.")
	else
		result =
			(await context.organizations.fetch(request.parameter.id))?.value ??
			gracely.client.notFound("that organization does not exist")
	return result
}

router.add("GET", "/organization/:id", fetch)
