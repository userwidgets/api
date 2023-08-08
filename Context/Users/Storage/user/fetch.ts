import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(_: http.Request, context: Context): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof fetch>>
	if (gracely.Error.is(context.users))
		result = context.users
	else
		result = (await context.users.fetch()) ?? gracely.client.notFound("that email does not exist")
	return result
}

router.add("GET", "/user", fetch)
