import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: gracely.Error | model.Application
	const application: model.Application.Creatable | any = await request.body
	const admin = context.authenticator.authenticate(request, "admin")
	if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else if (!model.Application.Creatable.is(application))
		result = gracely.client.invalidContent("model.Application", "Request body invalid")
	else if (!admin)
		result = gracely.client.unauthorized()
	else
		result = await context.storage.application.create(application)
	// if (!gracely.Error.is(result)) {
	// 	const issuer = context.tager.createIssuer(result.id)
	// 	Object.values(result.organizations).forEach(organization =>
	// 		organization.users.forEach(async email => {
	// 			const tag = await issuer.sign({
	// 				email: email,
	// 				organizationId: organization.id,
	// 			})
	// 			tag &&
	// 				context.email(
	// 					email,
	// 					`Invitation to ${(result as model.Application).name} by ${organization.name}`,
	// 					`${request.search.origin ?? request.url.origin}/${request.search.path ?? "user"}/${tag}`
	// 				)
	// 		})
	// 	)
	// }
	return result
}

router.add("POST", "/application", create)
