import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function fetch(
	request: http.Request,
	context: Context
): Promise<userwidgets.Organization | gracely.Error> {
	let result: userwidgets.Organization | gracely.Error
	if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/organization:id", "id", "string", "id required for this endpoint.")
	else
		result =
			(await context.organizations.fetch(request.parameter.id)) ??
			gracely.client.notFound("that organization does not exist")
	return result
}

router.add("GET", "/organization/:id", fetch)
