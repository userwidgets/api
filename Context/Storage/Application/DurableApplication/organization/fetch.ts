import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<model.Organization | gracely.Error> {
	return !request.parameter.id
		? gracely.client.invalidPathArgument("/organization/:id", "id", "string", "")
		: (await context.state.storage.get<model.Application>("data"))?.organizations[request.parameter.id] ??
				gracely.client.notFound("that organization does not exist")
}

router.add("GET", "/organization/:id", fetch)
