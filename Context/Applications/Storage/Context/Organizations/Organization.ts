import { flagly } from "flagly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"

export interface Organization extends Omit<userwidgets.Organization, "permissions"> {
	permissions: flagly.Flags
}
export namespace Organization {
	export const type = isly.object<Organization>({
		id: userwidgets.Organization.Identifier.type,
		name: isly.string(/.+/),
		permissions: flagly.Flags.type,
		created: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
		modified: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
		users: isly.array(userwidgets.Email.type),
	})
	export const is = userwidgets.Organization.is
	export const flaw = userwidgets.Organization.flaw
	export function model(organization: Organization): userwidgets.Organization {
		return {
			...organization,
			permissions: flagly.Flags.stringify(organization.permissions)
				.split(" ")
				.map(permission => permission.replace(/^[^.]+\./, "")),
		}
	}
	export function from(organization: userwidgets.Organization): Organization
	export function from(
		organization: userwidgets.Organization.Creatable & { id: userwidgets.Organization.Identifier }
	): Organization
	export function from(
		organization:
			| userwidgets.Organization
			| (userwidgets.Organization.Creatable & { id: userwidgets.Organization.Identifier })
	): Organization {
		const now = isoly.DateTime.now()
		return "created" in organization
			? {
					...organization,
					permissions: flagly.parse(
						Array.from(
							new Set([...userwidgets.User.Permissions.Organization.flags, ...organization.permissions]),
							permission => `*.${permission}`
						).join(" ")
					),
					users: Array.from(new Set(organization.users)),
			  }
			: {
					...organization,
					modified: now,
					created: now,
					// permissions: Array.from(new Set([...userwidgets.User.Permissions.Organization.flags, ...(organization.permissions) ?? []]), permission => )
					permissions: flagly.parse(
						Array.from(
							new Set([...userwidgets.User.Permissions.Organization.flags, ...(organization.permissions ?? [])]),
							permission => `*.${permission}`
						).join(" ")
					),
					users: [],
			  }
	}
}
