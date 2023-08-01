import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { common } from "../common"
import { Context } from "../Context"
import { Inviter } from "../Context/Inviter"
import { router } from "../router"

type Response =
	| { organization: gracely.Error }
	| { organization: model.Organization; feedback: model.User.Feedback[] | gracely.Error }

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | Response
	const organization: model.Organization.Creatable | any = await request.body
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	const url = common.url.parse(request.search.url)

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!model.Organization.Creatable.is(organization))
		result = gracely.client.invalidContent("model.Organization", "Request body invalid")
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!credentials || (credentials != "admin" && !credentials.permissions["*"]?.application?.write))
		result = gracely.client.unauthorized(
			`Not authorized for this action on userwidgets organization. Missing permissions. Received '${request.header.authorization}'`
		)
	else if (gracely.Error.is(context.inviter))
		result = context.inviter
	else {
		const created = await context.applications.organizations.create(organization)

		result = gracely.Error.is(created)
			? { organization: created }
			: {
					organization: created,
					feedback: await postProcess(created.id, organization, context, url, context.inviter),
			  }
	}
	return result
}

async function postProcess(
	organizationId: string,
	organization: model.Organization.Creatable,
	context: Context,
	url: URL | undefined,
	inviter: Inviter
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
			const invite = await inviter.create(signable)
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
