import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../../Context"
import * as password from "../../password"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<gracely.Result | gracely.Error> {
	let result: gracely.Result | gracely.Error
	const passwords: model.User.Password.Change = await request.body
	const user = await context.state.storage.get<model.User>("data")
	const current = await context.state.storage.get<cryptly.Password.Hash>("password")
	const entityTag = request.header.ifMatch?.at(0)
	if (!model.User.Password.Change.is(passwords))
		result = gracely.client.malformedContent(
			"User.Password.Change",
			"User.Password.Change",
			"A User.Password.Change object is required to change a users password."
		)
	else if (!model.User.Password.Change.validate(passwords))
		result = gracely.client.malformedContent(
			"User.Password.Change",
			"User.Password.Change",
			"A valid User.Password.Change object is required to change a users password."
		)
	else if (!user)
		result = gracely.client.notFound("Requested user data does not exist.")
	else if (!current)
		result = gracely.client.notFound("Requested user password does not exist.")
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (!isoly.DateTime.is(entityTag) && entityTag != "*")
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (entityTag != "*" && entityTag < user.modified)
		result = gracely.client.entityTagMismatch("Requested user have already changed.")
	else {
		const verifiedPassword = await password.verify(passwords.old, current, context.environment.hashSecret)
		if (gracely.Error.is(verifiedPassword))
			result = verifiedPassword
		else if (!verifiedPassword)
			result = gracely.client.invalidContent("password", "Old password does not match current password.")
		else {
			const passwordHash = await password.hash(passwords.new, context.environment.hashSecret)
			if (gracely.Error.is(passwordHash))
				result = passwordHash
			else {
				await context.state.storage.put<cryptly.Password.Hash>("password", passwordHash)
				result = gracely.success.noContent()
			}
		}
	}
	return result
}

router.add("PUT", "/user/password", change)
