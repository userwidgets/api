import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(
	request: http.Request,
	context: Context,
	retries = 5
): Promise<model.Organization | gracely.Error> {
	let result: model.Organization | gracely.Error
	const organization: model.Organization.Creatable = await request.body
	if (!model.Organization.Creatable.is(organization))
		result = gracely.client.malformedContent(
			"Organization.Creatable",
			"Organization.Creatable",
			"A valid Organization.Creatable object is required to create a new application."
		)
	else {
		const id = organization.id ?? cryptly.Identifier.generate(8)
		const current = await context.state.storage.get<model.Application>("data")
		if (!current)
			result = gracely.client.notFound("Application with this id does not exist.")
		else if (current.organizations[id] && retries > 0)
			result = await create(request, context, --retries)
		else {
			const now = isoly.DateTime.now()
			current.organizations[id] = result = {
				name: organization.name,
				permissions: organization.permissions,
				id,
				created: now,
				modified: now,
				users: organization.users.map(({ email }) => email),
			}
			await context.state.storage.put<model.Application>("data", current)
		}
	}
	return result
}

router.add("POST", "/organization", create)
