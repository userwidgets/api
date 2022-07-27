import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.User
	const user: model.User.Credentials | any = await request.body
	if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!model.User.Credentials.is(user))
		result = gracely.client.invalidContent("User.Credentials", "Request body invalid")
	else
		result = await context.storage.user.create(user)
	return result
}
router.add("POST", "/api/user", create)
