import * as gracely from "gracely"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

interface Email {
	recipient: string
	subject: string
	content: string
}
namespace Email {
	export function is(value: Email | any): value is Email {
		return (
			typeof value == "object" &&
			value &&
			typeof value.recipient == "string" &&
			typeof value.subject == "string" &&
			typeof value.content == "string"
		)
	}
}

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Result
	const authorization = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "admin")
	const body: Email | unknown = await request.body
	const email = await context.services.load.email()

	if (gracely.Error.is(authorization))
		result = authorization
	else if (authorization != "admin")
		result = gracely.client.unauthorized()
	else if (!Email.is(body))
		result = gracely.client.malformedContent("Email", "Email", "Body is missing either: subject, recipient or content.")
	else if (gracely.Error.is(email))
		result = email
	else {
		result = await email.send({
			recipients: { emails: body.recipient },
			subject: body.subject,
			content: { text: body.content },
		})
	}
	return result
}
router.add("POST", "/email", create)
