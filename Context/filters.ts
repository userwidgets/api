import { userwidgets } from "@userwidgets/model"

export namespace filters {
	export function user(permissions: userwidgets.User.Permissions, user: userwidgets.User): userwidgets.User {
		const result = user
		if (!userwidgets.User.Permissions.check(permissions, "*", "user.view")) {
			const organizations = Object.keys((({ "*": _, ...permissions }) => permissions)(permissions))
			const common = organizations.filter(
				organization =>
					organization in user.permissions && userwidgets.User.Permissions.check(permissions, organization, "user.view")
			)
			result.permissions = Object.fromEntries(Object.entries(user.permissions).filter(([id]) => common.includes(id)))
		}
		return result
	}
	export function organization(
		permissions: userwidgets.User.Permissions,
		organization: userwidgets.Organization
	): userwidgets.Organization {
		const result = organization
		if (!userwidgets.User.Permissions.check(permissions, organization.id, "org.view"))
			result.users = []
		return result
	}
	export function application(
		permissions: userwidgets.User.Permissions,
		application: userwidgets.Application
	): userwidgets.Application {
		const result = application
		if (!userwidgets.User.Permissions.check(permissions, "*", "app.view")) {
			result.organizations = Object.fromEntries(
				Object.entries(result.organizations).filter(([id]) => id in permissions)
			)
			result.organizations = Object.entries(result.organizations).reduce<userwidgets.Application["organizations"]>(
				(result, [id, o]) => ({ ...result, [id]: organization(permissions, o) }),
				{}
			)
		}
		return result
	}
}
