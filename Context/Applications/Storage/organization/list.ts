import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function list(_: http.Request, context: Context): Promise<userwidgets.Organization[] | gracely.Error> {
	return (await context.organizations.list()) ?? gracely.client.notFound("Organization not found.")
}

router.add("GET", "/organization", list)
