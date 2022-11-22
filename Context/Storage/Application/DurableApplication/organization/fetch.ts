import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<model.Organization | gracely.Error> {
	return !request.parameter.organizationId
		? gracely.client.invalidPathArgument(
				"/organization/:id",
				"id",
				"string",
				"organizationId must be specified in the URL."
		  )
		: (await context.state.storage.get<model.Application>("data"))?.organizations[request.parameter.organizationId] ??
				gracely.client.notFound("that organization does not exist")
}

router.add("GET", "/organization/:organizationId", fetch)
