import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(_: http.Request, context: Context): Promise<userwidgets.Application | gracely.Error> {
	return (await context.applications.fetch()) ?? gracely.client.notFound("that application does not exist")
}

router.add("GET", "/application", fetch)
