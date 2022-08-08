import * as gracely from "gracely"
import * as isoly from "isoly"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function create(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: any | gracely.Error = gracely.success.noContent()
	const admin = await context.authenticator.authenticate(request, "admin")
	if (!admin)
		result = gracely.client.unauthorized()
	else if (gracely.Error.is(context.storage.user))
		result = context.storage.user
	else if (gracely.Error.is(context.storage.application))
		result = context.storage.application
	else {
		const responses = await Promise.all([
			context.storage.user.seed({
				email: "john@example.com",
				name: { first: "John", last: "Doe" },
				permissions: {
					paxportAppId: {
						"*": {
							application: {
								read: true,
								write: true,
							},
							organization: {
								read: true,
								write: true,
							},
							user: {
								read: true,
								write: true,
							},
						},
						paxportOrgId: {
							organization: {
								read: true,
								write: true,
							},
							user: {
								read: true,
								write: true,
							},
						},
					},
					issuefabAppId: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						issuefabOrgId: {
							organization: {
								read: true,
								write: true,
							},
							user: {
								read: true,
								write: true,
							},
						},
						paxportOrgId: {
							organization: {
								read: true,
								write: true,
							},
							user: {
								read: true,
								write: true,
							},
						},
					},
				},
				// permissions: {
				// 	paxportAppId: { "*": "*", paxportOrgId: "*" },
				// 	issuefabAppId: { "*": "*", issuefabOrgId: "*", paxportOrgId: "*" },
				// },
				modified: isoly.DateTime.now(),
			}),
			context.storage.user.seed({
				email: "richard@example.com",
				name: { first: "Richard", last: "Doe" },
				permissions: {
					issuefabAppId: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						issuefabOrgId: {
							organization: {
								read: true,
								write: true,
							},
							user: {
								read: true,
								write: true,
							},
						},
					},
				},
				// permissions: { issuefabAppId: { "*": "", issuefabOrgId: "*" } },
				modified: isoly.DateTime.now(),
			}),
			context.storage.user.seed({
				email: "jane@example.com",
				name: { first: "Jane", last: "Doe" },
				permissions: {
					paxportAppId: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						paxportOrgId: {
							organization: {},
							user: {
								read: true,
							},
						},
					},
				},
				// permissions: { paxportAppId: { "*": "", paxportOrgId: "" } },
				modified: isoly.DateTime.now(),
			}),
			context.storage.user.seed({
				email: "mary@example.com",
				name: { first: "Mary", last: "Doe" },
				permissions: {
					issuefabAppId: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						issuefabOrgId: {
							organization: {},
							user: {},
						},
					},
				},
				// permissions: { issuefabAppId: { "*": "", issuefabOrgId: "" } },
				modified: isoly.DateTime.now(),
			}),
			context.storage.user.seed({
				email: "james@example.com",
				name: { first: "James", last: "Doe" },
				permissions: {
					issuefabAppId: {
						"*": {
							application: {},
							organization: {},
							user: {},
						},
						issuefabOrgId: {
							organization: {},
							user: {},
						},
					},
				},
				// permissions: { issuefabAppId: { "*": "", issuefabOrgId: "" } },
				modified: isoly.DateTime.now(),
			}),
			context.storage.application.seed({
				id: "issuefabAppId",
				name: "Issuefab",
				organizations: {
					issuefabOrgId: {
						id: "issuefabOrgId",
						name: "Issuefab AB",
						users: ["john@example.com", "richard@example.com", "mary@example.com", "james@example.com"],
						permissions: ["organization", "user"],
						modified: isoly.DateTime.now(),
					},
					paxportOrgId: {
						id: "paxportOrgId",
						name: "Paxport AB",
						users: ["john@example.com"],
						permissions: ["organization", "user"],
						modified: isoly.DateTime.now(),
					},
				},
				permissions: ["application", "organization", "user"],
				modified: isoly.DateTime.now(),
			}),
			context.storage.application.seed({
				id: "paxportAppId",
				name: "Issuefab",
				organizations: {
					paxportOrgId: {
						id: "paxportOrgId",
						name: "Paxport AB",
						users: ["john@example.com", "jane@example.com"],
						permissions: ["organization", "user"],
						modified: isoly.DateTime.now(),
					},
				},
				permissions: ["application", "organization", "user"],
				modified: isoly.DateTime.now(),
			}),
		])
		result = responses.find(response => gracely.Error.is(response)) ?? gracely.success.noContent()
	}
	return result
}

router.add("GET", "/seed", create)
