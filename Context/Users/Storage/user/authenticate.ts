import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function authenticate(
	request: http.Request,
	context: Context
): Promise<userwidgets.User.Key.Creatable | gracely.Error> {
	let result: Awaited<ReturnType<typeof authenticate>>
	const body: unknown = await request.body
	const credentials = userwidgets.User.Credentials.type.get(body)
	if (!credentials)
		result = gracely.client.flawedContent(userwidgets.User.Credentials.flaw(body))
	else if (gracely.Error.is(context.users))
		result = context.users
	else
		result = (await context.users.authenticate(credentials)) ?? gracely.client.unauthorized()
	return result
}

router.add("POST", "/user/authenticate", authenticate)
