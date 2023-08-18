import { cryptly } from "cryptly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
import { Permissions } from "./Permissions"

export interface User extends Omit<userwidgets.User.Creatable, "password" | "permissions"> {
	permissions: Permissions
	password: cryptly.Password.Hash
	created: isoly.DateTime
	modified: isoly.DateTime
}
export namespace User {
	export const type = isly.object<User>({
		email: userwidgets.Email.type,
		name: userwidgets.User.Name.type,
		permissions: Permissions.type,
		password: isly.fromIs("cryptly.Password.Hash", cryptly.Password.Hashed.is),
		created: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
		modified: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
	})
	export function model(user: User, application: string): userwidgets.User {
		return (({ password, permissions, ...user }) => ({ ...user, permissions: permissions[application] ?? {} }))(user)
	}
}
