import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(_: http.Request, context: Context): Promise<model.Organization[] | gracely.Error> {
	const result = await context.state.storage.get<model.Application>("data")
	return !result ? gracely.client.notFound("application does not exist") : Object.values(result.organizations)
}

router.add("GET", "/organization", list)
