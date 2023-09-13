import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: userwidgets.Organization | gracely.Error
	const body: unknown = await request.body
	const organization = userwidgets.Organization.Creatable.type.get(body)
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!organization)
		result = gracely.client.flawedContent(userwidgets.Organization.Creatable.flaw(body))
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (
		!credentials ||
		(credentials != "admin" && userwidgets.User.Permissions.check(credentials.permissions, "*", "org.create"))
	)
		result = gracely.client.unauthorized(
			`Not authorized for this action on userwidgets organization. Missing permissions.'`
		)
	else if (gracely.Error.is(context.inviter))
		result = context.inviter
	else {
		result = await context.applications.organizations.create(
			organization,
			credentials == "admin" ? undefined : credentials.permissions
		)
	}
	return result
}

router.add("POST", "/organization", create)
