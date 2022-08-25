import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import type { User } from "../Context/Storage/User"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.Organization
	const organization: model.Organization.Creatable | any = await request.body
	const key = context.authenticator.authenticate(request, /* "token",*/ "admin")
	let href: string | undefined
	try {
		const url = request.search.url ? new URL(request.search.url) : request.url
		href = (url.origin + url.pathname).replace(/\/$/, "")
	} catch (_) {
		href = undefined
	}
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!href)
		result = gracely.client.invalidQueryArgument("url", "string", "Invalid url")
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (!key)
		result = gracely.client.unauthorized()
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header required for this operation.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Application header should be a single value.")
	else {
		result = await context.storage.application.createOrganization(request.header.application, organization)
		if (result && !gracely.Error.is(result)) {
			const issuer = context.tager.createIssuer(request.header.application)
			result.users.forEach(async email => {
				const signable: model.User.Tag.Creatable = {
					email: email,
					active: gracely.Error.is(await (context.storage.user as User).fetch(email)) ? false : true,
					permissions: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						[(result as model.Organization).id]: {
							organization: { read: true, write: true },
							user: { read: true, write: true },
						},
					},
				}
				const tag = await issuer.sign(signable)
				tag && context.email(email, `Invitation from ${organization.name}`, `${href}/${tag}`)
			})
		}
	}

	return result
}
router.add("POST", "/organization", create)
