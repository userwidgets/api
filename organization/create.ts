import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

type Response =
	| { organization: gracely.Error }
	| { organization: model.Organization; feedback: model.User.Feedback[] | gracely.Error }

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | Response
	const organization: model.Organization.Creatable | any = await request.body
	const key = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	let url: URL | undefined
	try {
		url = request.search.url ? new URL(request.search.url) : undefined
	} catch (_) {
		url = undefined
	}
	if (url == request.url)
		result = gracely.client.missingQueryArgument("url", "string", "Missing query argument for registration URL.")
	else if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (gracely.Error.is(key))
		result = key
	else if (!key || (key != "admin" && !key.permissions["*"]?.application?.write))
		result = gracely.client.unauthorized(
			`Not authorized for this action on userwidgets organization. Missing permissions. Received '${request.header.authorization}'`
		)
	else if (gracely.Error.is(context.inviter))
		result = context.inviter
	else if (gracely.Error.is(context.inviter.issuer))
		result = context.inviter.issuer
	else {
		const created = await context.applications.createOrganization(organization)
		result = gracely.Error.is(created)
			? { organization: created }
			: {
					organization: created,
					feedback: await postProcess(created.id, organization, context, url, context.inviter.issuer),
			  }
	}
	return result
}

async function postProcess(
	organizationId: string,
	organization: model.Organization.Creatable,
	context: Context,
	url: URL | undefined,
	issuer: model.User.Invite.Issuer
): Promise<model.User.Feedback[]> {
	return await Promise.all(
		organization.users.map(async ({ email, permissions }) => {
			let result: model.User.Feedback | gracely.Error
			const signable: model.User.Invite.Creatable = {
				email: email,
				active: !gracely.Error.is(context.users) && gracely.Error.is(await context.users.fetch(email)) ? false : true,
				permissions: {
					...(permissions?.[0] && { "*": permissions[0] }),
					[organizationId]: permissions?.[1]
						? permissions[1]
						: Object.fromEntries(organization.permissions.map(permission => [permission, { read: true, write: true }])),
				},
			}
			const invite = await issuer.sign(signable)
			if (!invite)
				result = gracely.server.backendFailure("failed to sign.")
			else {
				url?.searchParams.set(
					model.Configuration.addDefault(
						{ inviteParameterName: context.environment.inviteParameterName },
						"inviteParameterName"
					).inviteParameterName,
					invite
				)
				result = {
					email: email,
					invite: invite,
					...(url && {
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
