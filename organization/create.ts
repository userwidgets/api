import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.Organization
	const organization: model.Organization.Creatable | any = await request.body
	const key = await context.authenticator.authenticate(request, "token", "admin")
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
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (!key)
		result = gracely.client.unauthorized()
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header required for this operation.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader("Application", "Application header should be a single value.")
	else if (key == "admin")
		(result = await context.storage.application.createOrganization(request.header.application, organization)) &&
			!gracely.Error.is(result) &&
			postProcess(result.id, organization, context, request.header.application, href)
	else if (!key.permissions["*"]?.application?.write)
		result = gracely.client.unauthorized()
	else {
		const application = await context.storage.application.fetch(request.header.application)
		gracely.Error.is(application)
			? (result = application)
			: (result = await context.storage.application.createOrganization(request.header.application, organization)) &&
			  !gracely.Error.is(result) &&
			  postProcess(result.id, organization, context, request.header.application, href)
	}
	return result
}

function postProcess(
	organizationId: string,
	organization: model.Organization.Creatable,
	context: Context,
	applicationId: string,
	href: string
): void {
	const issuer = context.tager.createIssuer(applicationId)
	organization.users.forEach(async ({ email, permissions }) => {
		const signable: model.User.Tag.Creatable = {
			email: email,
			active:
				!gracely.Error.is(context.storage.user) && gracely.Error.is(await context.storage.user.fetch(email))
					? false
					: true,
			permissions: {
				...(permissions?.[0] && { "*": permissions[0] }),
				[organizationId]: permissions?.[1]
					? permissions[1]
					: Object.fromEntries(organization.permissions.map(permission => [permission, { read: true, write: true }])),
			},
		}
		signable.permissions.asd?.user?.read
		const tag = await issuer.sign(signable)
		tag && context.email(email, `Invitation from ${organization.name}`, `${href}?id=${tag}`)
	})
}

router.add("POST", "/organization", create)
