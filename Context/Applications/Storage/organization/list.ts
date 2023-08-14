import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(_: http.Request, context: Context): Promise<model.Organization[] | gracely.Error> {
	return (await context.organizations.list())?.map(result => result.value) ?? []
}

router.add("GET", "/organization", list)
