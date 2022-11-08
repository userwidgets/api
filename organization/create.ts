import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

interface Response {
	organization: model.Organization | gracely.Error
	feedback?: model.User.Feedback[] | gracely.Error
}

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | Response
	const organization: model.Organization.Creatable | any = await request.body
	const key = await context.authenticator.authenticate(request, "token", "admin")
	const sendEmail = request.search.sendEmail == undefined || request.search.sendEmail != "false"
	let url: URL | undefined
	try {
		url = request.search.url ? new URL(request.search.url) : undefined
	} catch (_) {
		url = undefined
	}
	if (url == request.url)
		result = gracely.client.missingQueryArgument("url", "string", "Missing query argument for registration URL.")
	else if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (!url)
		result = gracely.client.invalidQueryArgument("url", "string", "Invalid url")
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (gracely.Error.is(key))
		result = key
	else if (!key || (key != "admin" && !key.permissions["*"]?.application?.write))
		result = gracely.client.unauthorized(
			`Not authorized for this action on userwidgets organization. Missing permissions. Received '${request.header.authorization}'`
		)
	else if (!request.header.application)
		result = gracely.client.missingHeader("Application", "Application header required for this operation.")
	else if (typeof request.header.application != "string")
		result = gracely.client.malformedHeader(
			"Application",
			"Application header should be a single value. No authorization."
		)
	else {
		const issuer = context.tager.createIssuer(request.header.application)
		gracely.Error.is(issuer)
			? (result = issuer)
			: (result = {
					organization: await context.storage.application.createOrganization(request.header.application, organization),
			  }) &&
			  !gracely.Error.is(result.organization) &&
			  (result.feedback = await postProcess(result.organization.id, organization, context, url, issuer, sendEmail))
	}
	return result
}

async function postProcess(
	organizationId: string,
	organization: model.Organization.Creatable,
	context: Context,
	url: URL,
	issuer: model.User.Tag.Issuer,
	sendEmail: boolean
): Promise<model.User.Feedback[]> {
	return await Promise.all(
		organization.users.map(async ({ email, permissions }) => {
			let result: model.User.Feedback | gracely.Error
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
			const tag = await issuer.sign(signable)
			if (!tag)
				result = gracely.server.backendFailure("failed to sign.")
			else {
				url.searchParams.set("id", tag)
				result = {
					email: email,
					tag: tag,
					...(sendEmail && {
						response: await context.email(
							email,
							`Invitation from ${organization.name}`,
							`You have been invited to join ${organization.name} via ${url.host}. Click here to join ${url}`
						),
					}),
				}
			}
			return result
		})
	)
}

router.add("POST", "/organization", create)
