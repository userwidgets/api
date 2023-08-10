import { flagly } from "flagly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
import { Organization } from "../Organizations/Organization"

export interface Application extends Omit<userwidgets.Application, "permissions" | "organizations"> {
	permissions: flagly.Flags
	organizations: Record<userwidgets.Organization.Identifier, Organization>
}
export namespace Application {
	export const type = isly.object<Application>({
		id: userwidgets.Application.Identifier.type,
		name: isly.string(),
		organizations: isly.record(userwidgets.Organization.Identifier.type, Organization.type),
		permissions: userwidgets.User.Permissions.type,
		created: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
		modified: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
	})
	export function model(application: Application): userwidgets.Application {
		return {
			...application,
			permissions: flagly.Flags.stringify(application.permissions)
				.split(" ")
				.map(permission => permission.replace(/^\*\./, "")),
			organizations: Object.fromEntries(
				Object.entries(application.organizations).map(([id, organization]) => [id, Organization.model(organization)])
			),
		}
	}
	export function from(application: userwidgets.Application): Application
	export function from(
		application: userwidgets.Application.Creatable & { id: userwidgets.Application.Identifier }
	): Application
	export function from(
		application:
			| userwidgets.Application
			| (userwidgets.Application.Creatable & { id: userwidgets.Application.Identifier })
	): Application {
		return "created" in application
			? {
					...application,
					permissions: flagly.parse(application.permissions.map(permission => `*.${permission}`).join(" ")),
					organizations: Object.fromEntries(
						Object.entries(application.organizations).map(([id, organization]) => [id, Organization.from(organization)])
					),
			  }
			: {
					...application,
					permissions: flagly.parse(
						Array.from(new Set([...userwidgets.User.Permissions.flags, ...(application.permissions ?? [])]))
							.map(permission => `*.${permission}`)
							.join(" ")
					),
					modified: isoly.DateTime.now(),
					created: isoly.DateTime.now(),
					organizations: {},
			  }
	}
}
