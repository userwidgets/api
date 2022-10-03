import * as gracely from "gracely"
// import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { User } from "../Context/Storage/User"
import { router } from "../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | { email: string; tag: string }[]
	const users: string[] | any = await request.body
	const key = await context.authenticator.authenticate(request, "token")
	let href: string | undefined
	try {
		const url = request.search.url ? new URL(request.search.url) : request.url
		href = url.origin + url.pathname
	} catch (_) {
		href = request.url.origin
	}
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!href)
		result = gracely.client.invalidQueryArgument("url", "string", "Invalid url")
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else if (!createIsArrayOf((value): value is string => typeof value == "string")(users))
		result = gracely.client.invalidContent("email", "Request body invalid")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/user/:organizationId",
			"organizationId",
			"string",
			"variable missing from url"
		)
	else if (!key.permissions["*"]?.user?.write && !key.permissions[request.parameter.organizationId]?.user?.write)
		result = gracely.client.unauthorized()
	else {
		const emails = await context.storage.application.updateOrganization(
			key.audience,
			request.parameter.organizationId,
			users
		)

		const issuer = context.tager.createIssuer(key.audience)
		result = gracely.Error.is(issuer)
			? issuer
			: gracely.Error.is(emails)
			? emails
			: ((
					await Promise.all(
						emails.map(async email => ({
							email: email,
							tag: await issuer.sign({
								email: email,
								active: gracely.Error.is(await (context.storage.user as User).fetch(email)) ? false : true,
								permissions: {
									[request.parameter.organizationId as string]: {
										user: { read: true, write: true },
									},
								},
							}),
						}))
					)
			  ).filter(({ tag }) => tag) as { email: string; tag: string }[])
	}

	return result
}

router.add("PATCH", "/organization/user/:organizationId", update)

function createIsArrayOf<T>(is: (value: any | T) => value is T): (value: any | T[]) => value is T[] {
	return (value): value is T[] => Array.isArray(value) && value.every(is)
}
