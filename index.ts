import { Context } from "./Context"
import { Environment } from "./Context/Environment"
import { DurableApplication } from "./Context/Storage/Application/DurableApplication"
import { DurableUser } from "./Context/Storage/User/DurableUser"

import "./version"
import "./user"
import "./application"
import "./organization"
import "./me"
import "./seed"

export { DurableUser, DurableApplication }

export default {
	async fetch(request: Request, environment: Environment) {
		return await Context.handle(request, environment)
	},
}
