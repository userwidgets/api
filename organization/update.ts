import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { common } from "../common"
import { Context } from "../Context"
import { router } from "../router"

type Response =
	| gracely.Error
	| { organization: gracely.Error }
	| {
			organization: userwidgets.Organization
			invites: userwidgets.User.Feedback.Invitation[]
			removals: userwidgets.User.Feedback.Notification[]
	  }

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: Response
	const credentials = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token", "admin")
	const url: URL | undefined = common.url.parse(request.search.url)
	const body: unknown = await request.body
	const organization = userwidgets.Organization.Changeable.type.get(body)
	const entityTag = request.header.ifMatch?.at(0)
	const email = await context.services.load.email()

	if (!organization)
		result = gracely.client.flawedContent(userwidgets.Organization.Changeable.flaw(body))
	else if (!request.parameter.id)
		result = result = gracely.client.invalidPathArgument(
			"/organization/user/:organizationId",
			"organizationId",
			"string",
			"variable missing from url"
		)
	else if (gracely.Error.is(email))
		result = email
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header must contain an entity tag.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("ifMatch", "If-Match header must contain a valid entity tag.")
	else if (gracely.Error.is(context.applications))
		result = context.applications
	else if (gracely.Error.is(credentials))
		result = credentials
	else if (!credentials)
		result = gracely.client.unauthorized()
	else if (
		// this action should be allowed without org.edit but only to invite. future issue
		credentials != "admin" &&
		organization.users &&
		(!userwidgets.User.Permissions.check(credentials.permissions, request.parameter.id, "org.edit", "user.invite") ||
			!(
				organization.users.every(invited => typeof invited == "string") ||
				userwidgets.User.Permissions.check(credentials.permissions, request.parameter.id, "user.admin")
			))
	)
		result = gracely.client.unauthorized("forbidden")
	else if (
		credentials != "admin" &&
		(organization.permissions || organization.name) &&
		!userwidgets.User.Permissions.check(credentials.permissions, request.parameter.id, "org.edit")
	)
		result = gracely.client.unauthorized("forbidden")
	else {
		result = await context.applications.organizations.update(
			request.parameter.id,
			organization,
			entityTag,
			credentials == "admin" ? undefined : credentials.permissions
		)
		if (url && !gracely.Error.is(result)) {
			await Promise.all(
				result.invites.map(async invite => {
					const result = { ...invite }
					if (!gracely.Error.is(invite)) {
						const inviteUrl = new URL(url.href)
						inviteUrl.searchParams.set(
							userwidgets.Configuration.addDefault(
								{ inviteParameterName: context.environment.inviteParameterName },
								"inviteParameterName"
							).inviteParameterName,
							invite.invite
						)
						Object.assign(result, {
							response: await email.send({
								subject: `You have been invited to join an organization.`,
								recipients: { emails: [invite.email] },
								content: { text: `Invitation: ${inviteUrl}` },
							}),
						})
					}
					return result
				})
			)
		}
	}
	return result
}

router.add("PATCH", "/organization/:id", update)
