import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../Context"
import * as data from "../package.json"
import { router } from "../router"
export async function fetch(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	const result: any = {
		name: data.name,
		version: data.version,
	}
	if (
		gracely.Error.is(context.authenticator)
			? context.authenticator
			: (await context.authenticator.authenticate(request, "admin")) == "admin"
	) {
		result.environment = context.environment
		result.dependencies = data.dependencies
	}

	return result
}
router.add("GET", "/version", fetch)
