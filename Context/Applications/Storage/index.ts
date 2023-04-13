import * as http from "cloudly-http"
import { Environment } from "../../Environment"
import { router } from "./router"

import "./application"
import "./organization"

export class DurableApplication {
	constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	async fetch(request: Request): Promise<Response> {
		return http.Response.to(
			await router.handle(http.Request.from(request), { state: this.state, environment: this.environment })
		)
	}
}
