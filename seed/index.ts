import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any | gracely.Error = gracely.success.noContent()
	console.log(request.header.authorization)
	const admin = await context.authenticator.authenticate(request, "admin")
	console.log(admin)
	if (!admin)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else {
		if (
			gracely.Error.is(
				(result = await context.storage.user.seed({
					email: "simon@app.com",
					name: { first: "Simon", last: "" },
					permissions: {
						paxportAppId: { "*": "*", paxportOrgId: "*" },
						issuefabAppId: { "*": "*", issuefabOrgId: "*", paxportOrgId: "*" },
					},
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else if (
			gracely.Error.is(
				(result = await context.storage.user.seed({
					email: "erik@app.com",
					name: { first: "Erik", last: "" },
					permissions: { issuefabAppId: { "*": "", issuefabOrgId: "*" } },
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else if (
			gracely.Error.is(
				(result = await context.storage.user.seed({
					email: "amanda@app.com",
					name: { first: "Amanda", last: "" },
					permissions: { paxportAppId: { "*": "", paxportOrgId: "" } },
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else if (
			gracely.Error.is(
				(result = await context.storage.user.seed({
					email: "elias@app.com",
					name: { first: "Elias", last: "" },
					permissions: { issuefabAppId: { "*": "", issuefabOrgId: "" } },
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else if (
			gracely.Error.is(
				(result = await context.storage.application.seed({
					id: "issuefabAppId",
					name: "Issuefab",
					organizations: {
						issuefabOrgId: {
							id: "issuefabOrgId",
							name: "Issuefab AB",
							users: ["elias@app.com", "simon@app.com", "erik@app.com"],
							modified: isoly.DateTime.now(),
						},
						paxportOrgId: {
							id: "paxportOrgId",
							name: "Paxport AB",
							users: ["simon@app.com"],
							modified: isoly.DateTime.now(),
						},
					},
					permissions: "",
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else if (
			gracely.Error.is(
				(result = await context.storage.application.seed({
					id: "paxportAppId",
					name: "Issuefab",
					organizations: {
						paxportOrgId: {
							id: "paxportOrgId",
							name: "Paxport AB",
							users: ["simon@app.com", "amanda@app.com"],
							modified: isoly.DateTime.now(),
						},
					},
					permissions: "",
					modified: isoly.DateTime.now(),
				}))
			)
		)
			console.log(result)
		else {
			result = gracely.success.noContent()
		}
	}
	return result
}

router.add("GET", "/api/seed", create)
