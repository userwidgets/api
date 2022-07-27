import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import * as password from "../password"
import { router } from "../router"

export async function authenticate(request: http.Request, context: Context): Promise<model.User | gracely.Error> {
	let result: model.User | gracely.Error
	const credentials: model.User.Credentials | any = await request.body
	if (!model.User.Credentials.is(credentials))
		result = gracely.client.malformedContent(
			"User.Credentials",
			"User.Credentials",
			"A valid User.Credentials object is required to create a new organization."
		)
	else {
		const currentHash = await context.state.storage.get<cryptly.Password.Hash>("password")
		if (!currentHash)
			result = gracely.client.notFound("Requested user does not exist.")
		else {
			const verified = await password.verify(credentials.password, currentHash, context.environment.hashSecret)
			if (!verified)
				result = gracely.client.unauthorized("Email and password does not match.")
			else if (gracely.Error.is(verified))
				result = verified
			else {
				const currentUser = await context.state.storage.get<model.User>("data")
				if (!currentUser)
					result = gracely.server.backendFailure("Password stored but no user data is found.")
				else
					result = currentUser
			}
		}
	}
	return result
}

router.add("POST", "/user/authenticate", authenticate)
