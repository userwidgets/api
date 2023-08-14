import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(
	request: http.Request,
	context: Context
): Promise<userwidgets.Organization | gracely.Error> {
	let result: Awaited<ReturnType<typeof update>>
	const body = await request.body
	const organization = userwidgets.Organization.Changeable.type.get(body)
	const entityTag = request.header.ifMatch?.at(0)

	if (gracely.Error.is(context.organizations))
		result = context.organizations
	else if (!request.parameter.id)
		result = gracely.client.invalidPathArgument("/organization/:id", "id", "string", "id must be specified in the URL.")
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header must contain an entity tag.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "Expected If-Match to be a date or *.")
	else if (!organization)
		result = gracely.client.flawedContent(userwidgets.Organization.Changeable.flaw(body))
	else {
		const current = await context.organizations.fetch(request.parameter.id)
		if (!current)
			result = gracely.client.notFound()
		else if (entityTag != "*" && entityTag < current.modified)
			result = result = gracely.client.entityTagMismatch("Requested organization is already changed.")
		else
			result = (await context.organizations.update(request.parameter.id, organization)) ?? gracely.client.notFound()
	}

	return result
}

router.add("PATCH", "/organization/:id", update)
