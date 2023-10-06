import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { isly } from "isly"
import { Context } from "../Context"
import { router } from "../router"

type Body = userwidgets.User.Credentials | userwidgets.User.Key
namespace Body {
	export const type = isly.union<Body, userwidgets.User.Credentials, userwidgets.User.Key>(
		userwidgets.User.Credentials.type,
		userwidgets.User.Key.type
	)
}
export async function authenticate(
	request: http.Request,
	context: Context
): Promise<userwidgets.User.Key.Creatable | gracely.Error> {
	let result: Awaited<ReturnType<typeof authenticate>>
	const credentials: unknown = await request.body
	const authorization = Body.type.get(credentials)
	if (!authorization)
		result = gracely.client.flawedContent(userwidgets.User.Credentials.flaw(credentials))
	else if (gracely.Error.is(context.users))
		result = context.users
	else
		result = (await context.users.authenticate(authorization)) ?? gracely.client.unauthorized()
	return result
}

router.add("POST", "/user/authenticate", authenticate)
