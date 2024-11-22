import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { typedly } from "typedly"
// This file is needed to avoid circular dependencies between Applications/index, Applications/Organizations and Users/index
export namespace filters {
	export function user(
		permissions: userwidgets.User.Permissions,
		user: userwidgets.User
	): userwidgets.User | undefined {
		let result: ReturnType<typeof filters.user> = user
		if (!userwidgets.User.Permissions.check(permissions, "*", "user.view")) {
			const organizations = Object.keys((({ "*": _, ...permissions }) => permissions)(permissions))
			const common = organizations.filter(organization =>
				userwidgets.User.Permissions.check(permissions, organization, "user.view")
			)
			if (!common.length)
				result = undefined
			else
				result.permissions = userwidgets.User.Permissions.filter(result.permissions, common)
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
	): userwidgets.Application | undefined {
		const result: ReturnType<typeof filters.application> = application
		const member = new Set(userwidgets.User.Permissions.organizations(permissions))
		if (!typedly.Object.keys(application.organizations).find(organization => member.has(organization))) {
			const now = isoly.DateTime.now()
			result.modified = now
			result.created = now
			result.permissions = []
		}
		if (!userwidgets.User.Permissions.check(permissions, "*", "app.view")) {
			result.organizations = Object.entries(result.organizations).reduce((result, [id, o]) => {
				const filtered = id in permissions && organization(permissions, o)
				return !filtered ? result : Object.assign(result, { [id]: filtered })
			}, {})
		}
		return result
	}
}
