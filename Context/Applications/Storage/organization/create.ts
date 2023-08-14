import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(
	request: http.Request,
	context: Context
): Promise<userwidgets.Organization | gracely.Error> {
	// make sure permissions on the users exits in the organization / application
	let result: userwidgets.Organization | gracely.Error
	const id = await context.organizations.id()
	const body: unknown = await request.body
	const organization = userwidgets.Organization.Creatable.type.get(body)
	if (!organization)
		result = gracely.client.flawedContent(userwidgets.Organization.flaw(body))
	else if (!userwidgets.Organization.Identifier.is(id))
		result = gracely.client.flawedContent(userwidgets.Organization.Identifier.flaw(id))
	else if (!id)
		result = gracely.server.backendFailure("unable to generate id")
	else
		result =
			(await context.organizations.create({ ...organization, id })) ??
			gracely.server.backendFailure("Change this error")
	return result
}

router.add("POST", "/organization", create)
