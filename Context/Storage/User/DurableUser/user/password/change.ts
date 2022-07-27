import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../../Context"
import * as password from "../../password"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<gracely.Result | gracely.Error> {
	let result: gracely.Result | gracely.Error
	const passwords: model.User.PasswordChange = await request.body
	const current = await context.state.storage.get<cryptly.Password.Hash>("password")
	if (!model.User.PasswordChange.is(passwords))
		result = gracely.client.malformedContent(
			"User.PasswordChange",
			"User.PasswordChange",
			"A valid User.PasswordChange object is required to change a users password."
		)
	else if (!current)
		result = gracely.client.notFound("Requested user does not exist.")
	else {
		const verifiedPassword = await password.verify(passwords.old, current, context.environment.hashSecret)
		if (!verifiedPassword)
			result = gracely.client.invalidContent("password", "Old password does not match current password.")
		else if (gracely.Error.is(verifiedPassword))
			result = verifiedPassword
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
