import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as password from "../password"
import { router } from "../router"

export async function seed(request: http.Request, context: Context) {
	console.log("I AM SEEDING")
	let result: model.User | gracely.Error
	const user: model.User = await request.body
	const current = await context.state.storage.get<model.User>("data")
	if (!model.User.is(user))
		result = gracely.client.malformedContent("User", "User", "A valid User object is required to seed a new user.")
	else if (current)
		result = gracely.client.invalidContent("user", "A user with that email already exists.")
	else {
		const passwordHash = await password.hash("asd123", context.environment.hashSecret)
		if (gracely.Error.is(passwordHash))
			result = passwordHash
		else {
			await context.state.storage.put<cryptly.Password.Hash>("password", passwordHash)
			await context.state.storage.put<model.User>("data", (result = user))
		}
	}
	return result
}
router.add("POST", "/user/seed", seed)
