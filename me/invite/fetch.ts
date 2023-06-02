import * as gracely from "gracely"
import * as authly from "authly"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: authly.Token | gracely.Error
	if (gracely.Error.is(context.inviter))
		result = context.inviter
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/me/invite/:id", "id", "string", "id must be specified in the URL.")
	else
		result =
			(await context.inviter.fetch(request.parameter.id)) ??
			gracely.client.notFound("Invitation was not found or expired.")

	return result
}

router.add("GET", "/me/invite/:id", fetch)
