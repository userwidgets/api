import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { common } from "../common"
import { Context } from "../Context"
import { router } from "../router"

type Response =
	| gracely.Error
	| { organization: gracely.Error }
	| { organization: model.Organization; feedback: model.User.Feedback[] | gracely.Error }

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: Response
	const emails: string[] | any = await request.body
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const url: URL | undefined = common.url.parse(request.search.url)

	if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (request.url == url)
		result = gracely.client.invalidQueryArgument("url", "string", "Invalid url")
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!createIsArrayOf((value): value is string => typeof value == "string")(emails))
		result = gracely.client.invalidContent("email", "Request body invalid.")
	else if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/organization/user/:organizationId",
			"organizationId",
			"string",
			"variable missing from url"
		)
	else if (
		!credentials.permissions["*"]?.user?.write &&
		!credentials.permissions[request.parameter.organizationId]?.user?.write
	)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.inviter))
		result = context.inviter
	else {
		const organizationId = request.parameter.organizationId
		const issuer = context.inviter
		const users = context.users
		const neophytes = await context.applications.organizations.update(request.parameter.organizationId, emails, url)
		result = gracely.Error.is(neophytes)
			? neophytes
			: await Promise.all(
					neophytes.map(async email => {
						let result: model.User.Feedback.Invitation
						const invite = await issuer.create({
							email: email,
							active: gracely.Error.is(await users.fetch(email)) ? false : true,
							permissions: {
								[organizationId]: {
									user: { read: true, write: true },
								},
							},
						})
						if (!invite)
							result = gracely.server.backendFailure("failed to sign invite.")
						else {
							if (url)
								url.searchParams.set(
									model.Configuration.addDefault(
										{ inviteParameterName: context.environment.inviteParameterName },
										"inviteParameterName"
									).inviteParameterName,
									invite
								)
							result = {
								email,
								invite,
								...(url && {
									response: await context.email(
										email,
										`You have been invited to join an organization.`,
										`Invitation: ${url}`
									),
								}),
							}
						}
						return result
					})
			  )
	}

	return result
}

router.add("PATCH", "/organization/user/:organizationId", update)

function createIsArrayOf<T>(is: (value: any | T) => value is T): (value: any | T[]) => value is T[] {
	return (value): value is T[] => Array.isArray(value) && value.every(is)
}
