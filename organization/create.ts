import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { common } from "../common"
import { Context } from "../Context"
import { Environment } from "../Context/Environment"
import { Inviter } from "../Context/Inviter"
import { Users } from "../Context/Users"
import { router } from "../router"

type Response =
	| { organization: gracely.Error }
	| { organization: userwidgets.Organization; feedback: userwidgets.User.Feedback[] | gracely.Error }

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | Response
	const body: unknown = await request.body
	const organization = userwidgets.Organization.Creatable.type.get(body)
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	const url = common.url.parse(request.search.url)

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!organization)
		result = gracely.client.flawedContent(userwidgets.Organization.Creatable.flaw(body))
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (
		!credentials ||
		(credentials != "admin" && userwidgets.User.Permissions.check(credentials.permissions, "*", "org.create"))
	)
		result = gracely.client.unauthorized(
			`Not authorized for this action on userwidgets organization. Missing permissions.'`
		)
	else if (gracely.Error.is(context.inviter))
		result = context.inviter
	else {
		const created = await context.applications.organizations.create(
			organization,
			credentials == "admin" ? undefined : credentials.permissions
		)

		result = gracely.Error.is(created)
			? { organization: created }
			: {
					organization: created,
					feedback: await postProcess(
						created.id,
						organization,
						{ inviter: context.inviter, users: context.users, environment: context.environment, email: context.email },
						url
					),
			  }
	}
	return result
}

async function postProcess(
	id: string,
	organization: userwidgets.Organization.Creatable,
	context: { inviter: Inviter; users: Users; environment: Environment; email: Context["email"] },
	url: URL | undefined
): Promise<userwidgets.User.Feedback[]> {
	return await Promise.all(
		organization.users.map(async ({ email, permissions }) => {
			let result: userwidgets.User.Feedback | gracely.Error
			const signable: userwidgets.User.Invite.Creatable = {
				email: email,
				active: !gracely.Error.is(context.users) && gracely.Error.is(await context.users.fetch(email)) ? false : true,
				permissions: userwidgets.User.Permissions.merge(
					(permissions?.["*"] && userwidgets.User.Permissions.set({}, "*", permissions["*"])) ?? {},
					(permissions?.organization && userwidgets.User.Permissions.set({}, id, permissions.organization)) ?? {}
				),
			}
			const invite = await context.inviter.create(signable)
			if (!invite)
				result = gracely.server.backendFailure("failed to sign.")
			else {
				url?.searchParams.set(
					userwidgets.Configuration.addDefault(
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
