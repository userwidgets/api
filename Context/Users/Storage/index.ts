import * as http from "cloudly-http"
import { Environment } from "../../Environment"
import { router } from "./router"

import "./user"

export class DurableUser {
	constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		const work = await router.handle(http.Request.from(request), { state: this.state, environment: this.environment })
		return http.Response.to(work)
	}
}
