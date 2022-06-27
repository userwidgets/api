import * as gracely from "gracely"
import * as http from "cloudly-http"
import * as model from "../../../../../../model"
import { Context } from "../../../Context"
import { router } from "../router"

export async function fetch(_: http.Request, context: Context): Promise<model.Application | gracely.Error> {
	return (
		(await context.state.storage.get<model.Application>("data")) ??
		gracely.client.notFound("that application does not exist")
	)
}

router.add("GET", "/application", fetch)
