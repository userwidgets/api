import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function remove(_: http.Request, context: Context): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof remove>>
	if (gracely.Error.is(context.users))
		result = context.users
	else
		result = (await context.users.remove()) ?? gracely.client.notFound()
	return result
}
router.add("DELETE", "/user", remove)
