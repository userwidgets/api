import * as gracely from "gracely"
import * as isoly from "isoly"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../../Context"
import { router } from "../router"

export async function update(request: http.Request, context: Context) {
	let result: model.User | gracely.Error
	const tag: model.User.Tag | any = await request.body
	const current = await context.state.storage.get<model.User>("data")
	if (!model.User.Tag.is(tag))
		result = gracely.client.malformedContent(
			"User.Tag",
			"User.Tag",
			"A valid User.Tag object is required to update a new user."
		)
	else if (!current)
		result = gracely.client.invalidContent("user", "A user with that email does not exists.")
	else {
		const permissions = current.permissions[tag.audience]
		const missing = Object.fromEntries(
			Object.entries(tag.permissions).filter(([key, _]) => permissions && !(key in permissions))
		)
		Object.keys(missing).length
			? await context.state.storage.put<model.User>(
					"data",
					(result = {
						...current,
						permissions: {
							...current.permissions,
							[tag.audience]: {
								...current.permissions[tag.audience],
								"*": {
									application: {
										read:
											permissions?.["*"]?.application?.read || tag.permissions["*"]?.application?.read ? true : false,
										write:
											permissions?.["*"]?.application?.write || tag.permissions["*"]?.application?.write ? true : false,
									},
									organization: {
										read:
											permissions?.["*"]?.organization?.read || tag.permissions["*"]?.organization?.read ? true : false,
										write:
											permissions?.["*"]?.organization?.write || tag.permissions["*"]?.organization?.write
												? true
												: false,
									},
									user: {
										read: permissions?.["*"]?.user?.read || tag.permissions["*"]?.user?.read ? true : false,
										write: permissions?.["*"]?.user?.write || tag.permissions["*"]?.user?.write ? true : false,
									},
								},
								...missing,
							},
						},
						modified: isoly.DateTime.now(),
					})
			  )
			: (result = gracely.client.invalidContent("permissions", "You have already joined this organization."))
	}
	return result
}
router.add("PATCH", "/user", update)
