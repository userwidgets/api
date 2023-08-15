import { userwidgets } from "@userwidgets/model"

export namespace filters {
	export function user(
		permissions: userwidgets.User.Permissions,
		user: userwidgets.User
	): userwidgets.User | undefined {
		let result: ReturnType<typeof filters.user> = user
		if (!userwidgets.User.Permissions.check(permissions, "*", "user.view")) {
			const organizations = Object.keys((({ "*": _, ...permissions }) => permissions)(permissions))
			const common = organizations.filter(
				organization =>
					organization in user.permissions && userwidgets.User.Permissions.check(permissions, organization, "user.view")
			)
			if (!common.length)
				result = undefined
			else
				result.permissions = Object.fromEntries(Object.entries(user.permissions).filter(([id]) => common.includes(id)))
		}
		return result
	}
	export function organization(
		permissions: userwidgets.User.Permissions,
		organization: userwidgets.Organization
	): userwidgets.Organization | undefined {
		let result: ReturnType<typeof filters.organization> = organization
		if (!userwidgets.User.Permissions.check(permissions, organization.id, "user.view"))
			if (!(organization.id in permissions))
				result = undefined
			else
				result.users = []
		return result
	}
	export function application(
		permissions: userwidgets.User.Permissions,
		application: userwidgets.Application
	): userwidgets.Application {
		const result: ReturnType<typeof filters.application> = application
		if (!userwidgets.User.Permissions.check(permissions, "*", "app.view")) {
			result.organizations = Object.fromEntries(
				Object.entries(result.organizations).filter(([id]) => id in permissions)
			)
			// result.organizations = Object.entries(result.organizations).reduce<userwidgets.Application["organizations"]>(
			// 	(result, [id, o]) => ({ ...result, [id]: organization(permissions, o) }),
			// 	{}
			// )
		}
		return result
	}
}
