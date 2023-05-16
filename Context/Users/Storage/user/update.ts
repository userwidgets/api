import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context) {
	let result: model.User | gracely.Error
	const invite: model.User.Invite | any = await request.body
	const current = await context.state.storage.get<model.User>("data")
	if (!model.User.Invite.is(invite))
		result = gracely.client.malformedContent(
			"User.Invite",
			"User.Invite",
			"A valid User.Invite object is required to update a new user."
		)
	else if (!current)
		result = gracely.client.invalidContent("user", "A user with that email does not exists.")
	else {
		const permissions = current.permissions[invite.audience]
		const missing = Object.fromEntries(
			Object.entries(invite.permissions).filter(([key, _]) => permissions && !(key in permissions))
		)
		Object.keys(missing).length
			? await context.state.storage.put<model.User>(
					"data",
					(result = {
						...current,
						permissions: {
							...current.permissions,
							[invite.audience]: {
								...current.permissions[invite.audience],
								"*": {
									application: {
										read:
											permissions?.["*"]?.application?.read || invite.permissions["*"]?.application?.read
												? true
												: false,
										write:
											permissions?.["*"]?.application?.write || invite.permissions["*"]?.application?.write
												? true
												: false,
									},
									organization: {
										read:
											permissions?.["*"]?.organization?.read || invite.permissions["*"]?.organization?.read
												? true
												: false,
										write:
											permissions?.["*"]?.organization?.write || invite.permissions["*"]?.organization?.write
												? true
												: false,
									},
									user: {
										read: permissions?.["*"]?.user?.read || invite.permissions["*"]?.user?.read ? true : false,
										write: permissions?.["*"]?.user?.write || invite.permissions["*"]?.user?.write ? true : false,
									},
								},
								...missing,
							},
						},
						modified: isoly.DateTime.now(),
					})
			  )
			: (result = { status: 410, type: "gone", error: "You have already joined this organization." })
	}
	return result
}
router.add("PATCH", "/user", update)
