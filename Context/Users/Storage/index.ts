import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Environment } from "../../Environment"
import { Context } from "./Context"
import { router } from "./router"

import "./user"

export class DurableUser {
	constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		let result: http.Response
		try {
			const context = Context.create(this.state, this.environment, http.Request.from(request))
			result = await router.handle(context.request, context)
		} catch (error) {
			console.log("DurableUser error", error)
			const details = (typeof error == "object" && error && error.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return http.Response.to(result)
	}
}
