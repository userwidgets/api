import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { isly } from "isly"
import { Context } from "../Context"
import { router } from "../router"

type Body = userwidgets.User.Invite | userwidgets.User.Changeable
namespace Body {
	export const type = isly.union<Body, userwidgets.User.Invite, userwidgets.User.Changeable>(
		userwidgets.User.Invite.type,
		userwidgets.User.Changeable.type
	)
}
export async function update(request: http.Request, context: Context): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof update>>
	const raw = await request.body
	const body = Body.type.get(raw)
	if (!body)
		result = gracely.client.flawedContent(Body.type.flaw(raw))
	else if ("token" in body)
		result = await join(context, body)
	else
		result = await user(request, context, body)

	return result
}
async function user(
	request: http.Request,
	context: Context,
	user: userwidgets.User.Changeable
): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof update>>
	const entityTag = request.header.ifMatch?.at(0)
	if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "Expected If-Match to be a date or *.")
	else if (gracely.Error.is(context.users))
		result = context.users
	else {
		const current = await context.users.fetch()
		if (!current)
			result = gracely.client.notFound()
		else if (entityTag != "*" && entityTag < current.modified)
			result = gracely.client.entityTagMismatch("Requested user have already changed.")
		else
			result =
				(await context.users.update(user)) ?? gracely.client.invalidContent("User.Changeable", "Unable to store user.")
	}
	return result
}
async function join(context: Context, invite: userwidgets.User.Invite): Promise<userwidgets.User | gracely.Error> {
	let result: Awaited<ReturnType<typeof update>>
	if (gracely.Error.is(context.users))
		result = context.users
	else {
		const user = await context.users.join(invite)
		result = !user ? gracely.client.invalidContent("User.Invite", "Unable to join this organization.") : user
	}
	return result
}

router.add("PATCH", "/user", update)
