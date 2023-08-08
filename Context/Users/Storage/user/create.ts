import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof create>>
	const body: unknown = await request.body
	if (!userwidgets.User.Creatable.is(body))
		result = gracely.client.flawedContent(userwidgets.User.Creatable.flaw(body))
	else if (gracely.Error.is(context.users))
		result = context.users
	else
		result =
			(await context.users.create(body)) ??
			gracely.client.invalidContent("user", "A user with that email already exists.")
	return result
}
router.add("POST", "/user", create)
