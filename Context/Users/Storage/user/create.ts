import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import * as password from "../password"
import { router } from "../router"

export async function create(request: http.Request, context: Context) {
	let result: model.User | gracely.Error
	const user: model.User.Creatable | any = await request.body
	const current = await context.state.storage.get<model.User>("data")
	if (!model.User.Creatable.is(user))
		result = gracely.client.malformedContent(
			"User.Credentials",
			"User.Credentials",
			"A valid User.Credentials object is required to create a new user."
		)
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "application header is required for this endpoint.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Only single value allowed.")
	else if (current)
		result = gracely.client.invalidContent("user", "A user with that email already exists.")
	else {
		const passwordHash = await password.hash(user.password.new, context.environment.hashSecret)
		if (gracely.Error.is(passwordHash))
			result = passwordHash
		else {
			await context.state.storage.put<cryptly.Password.Hash>("password", passwordHash)
			const now = isoly.DateTime.now()
			await context.state.storage.put<model.User>(
				"data",
				(result = {
					name: user.name,
					email: user.email.toLowerCase(),
					permissions: {
						[request.header.application]: user.permissions,
					},
					created: now,
					modified: now,
				})
			)
		}
	}
	return result
}
router.add("POST", "/user", create)
