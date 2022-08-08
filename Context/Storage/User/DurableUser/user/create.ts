import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as password from "../password"
import { router } from "../router"

export async function create(request: http.Request, context: Context) {
	let result: model.User | gracely.Error
	const credentials: model.User.Credentials | any = await request.body
	const current = await context.state.storage.get<model.User>("data")
	if (!model.User.Credentials.is(credentials))
		result = gracely.client.malformedContent(
			"User.Credentials",
			"User.Credentials",
			"A valid User.Credentials object is required to create a new user."
		)
	else if (current)
		result = gracely.client.invalidContent("user", "A user with that email already exists.")
	else {
		const passwordHash = await password.hash(credentials.password, context.environment.hashSecret)
		if (gracely.Error.is(passwordHash))
			result = passwordHash
		else {
			await context.state.storage.put<cryptly.Password.Hash>("password", passwordHash)
			const emailUser = credentials.user.split("@").shift() ?? ""
			await context.state.storage.put<model.User>(
				"data",
				(result = {
					name: { first: emailUser, last: emailUser },
					email: credentials.user,
					permissions: {},
					modified: isoly.DateTime.now(),
				})
			)
		}
	}
	return result
}
router.add("POST", "/user", create)
