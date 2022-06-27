import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as model from "../../../../../../model"
import { Context } from "../../../Context"
import { router } from "../router"

export async function fetch(request: http.Request, context: Context): Promise<model.Organization | gracely.Error> {
	return (
		(await context.state.storage.get<model.Application>("data"))?.organizations[request.parameter.id] ??
		gracely.client.notFound("that organization does not exist")
	)
}

router.add("GET", "/organization/:id", fetch)
