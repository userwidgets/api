import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function update(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: model.User.Readable | gracely.Error
	const key = gracely.Error.is(context.authenticator)
		? context.authenticator
		: await context.authenticator.authenticate(request, "token")
	const permissions: unknown = await request.body
	const entityTag = request.header.ifMatch?.at(0)

	if (!request.parameter.organizationId)
		result = gracely.client.invalidPathArgument(
			"/user/:email/permission/:organizationId",
			"organizationId",
			"string",
			"organizationId must be specified in the URL."
		)
	else if (!request.parameter.email)
		result = gracely.client.invalidPathArgument(
			"/user/:email/permission/:organizationId",
			"email",
			"string",
			"email must be specified in the URL."
		)
	else if (!entityTag)
		result = gracely.client.missingHeader("If-Match", "If-Match header is required.")
	else if (entityTag != "*" && !isoly.DateTime.is(entityTag))
		result = gracely.client.malformedHeader("If-Match", "Expected entityTag to be of type isoly.DateTime or '*'")
	else if (gracely.Error.is(context.users))
		result = context.users
	else if (!model.User.Permissions.Readable.is(permissions))
		result = gracely.client.malformedContent(
			"User.Permissions.Readable",
			"User.Permissions.Readable",
			"A valid User.Permissions.Readable is required to update the permissions of a user."
		)
	else if (!key)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(key))
		result = key
	else if (!model.User.Permissions.Readable.allowUpdate(key, permissions))
		result = gracely.client.unauthorized("forbidden")
	else {
		const response = await context.users.updatePermissions(
			request.parameter.organizationId,
			request.parameter.email,
			permissions,
			entityTag
		)
		result = gracely.Error.is(response)
			? response
			: key.permissions["*"]?.user?.read || key.permissions[request.parameter.organizationId]
			? response
			: (({ created, modified, ...readable }) => readable)(response)
	}
	return result
}

router.add("PATCH", "/user/:email/permission/:organizationId", update)
