import { Context } from "./Context"
import { Environment } from "./Context/Environment"

import "./version"
import "./user"
import "./application"
import "./organization"
import "./me"

export { DurableApplication } from "./Context/Applications/Storage/"
export { DurableUser } from "./Context/Users/Storage"

export default {
	async fetch(request: Request, environment: Environment) {
		return await Context.handle(request, environment)
	},
}
