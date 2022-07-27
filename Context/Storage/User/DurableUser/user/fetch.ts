import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function fetch(_: http.Request, context: Context): Promise<model.User | gracely.Error> {
	return (await context.state.storage.get<model.User>("data")) ?? gracely.client.notFound("that email does not exist")
}

router.add("GET", "/user", fetch)
