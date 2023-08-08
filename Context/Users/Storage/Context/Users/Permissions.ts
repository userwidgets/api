import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
export interface Permissions {
	[application: userwidgets.Application.Identifier]: userwidgets.User.Permissions | undefined
}
export namespace Permissions {
	export const type = isly.record<userwidgets.Application.Identifier, userwidgets.User.Permissions | undefined>(
		userwidgets.Application.Identifier.type,
		userwidgets.User.Permissions.type.optional()
	)
}
