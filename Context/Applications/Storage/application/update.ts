import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(
	request: http.Request,
	context: Context
): Promise<userwidgets.Application | gracely.Error> {
	// TODO implement
	let result: userwidgets.Application | gracely.Error
	result = await context.applications.update()
	return result
}

router.add("PATCH", "/application/:id", update)
