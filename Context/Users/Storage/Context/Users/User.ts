import { cryptly } from "cryptly"
import { flagly } from "flagly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
import type { Users } from "./index"
import { Password } from "./Password"
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
	export function model(context: Users["context"], user: User): userwidgets.User {
		return (({ password, permissions, ...user }) => ({
			...user,
			permissions: flagly.Flags.stringify(permissions[context.application] ?? {}),
		}))(user)
	}
	export async function update(
		context: Users["context"],
		user: User,
		patch: Partial<userwidgets.User.Changeable>
	): Promise<User | undefined>
	export async function update(context: Users["context"], user: User, invite: userwidgets.User.Invite): Promise<User>
	export async function update(
		context: Users["context"],
		source: User,
		patch: userwidgets.User.Invite | Partial<userwidgets.User.Changeable>
	): Promise<User | undefined> {
		let result: User | undefined
		if (userwidgets.User.Invite.is(patch)) {
			patch.permissions
			source.permissions
			result = {
				...source,
				permissions: {
					[context.application]: userwidgets.User.Permissions.merge(
						source.permissions[context.application] ?? {},
						patch.permissions
					),
				},
			}
		} else {
			const password = !patch.password
				? source.password
				: patch.password.new != patch.password.repeat
				? undefined
				: "old" in patch.password && !(await Password.verify(patch.password.old, source.password, context.secret))
				? undefined
				: await Password.hash(patch.password.new, context.secret)
			result = !password
				? undefined
				: {
						...source,
						...(patch.permissions != undefined && {
							permissions: {
								...source.permissions,
								[context.application]: flagly.parse(patch.permissions) as userwidgets.User.Permissions,
							},
						}),
						password,
				  }
		}
		return result
	}
	export async function from(
		context: Users["context"],
		user: userwidgets.User,
		secret: Pick<User, "password">
	): Promise<User>
	export async function from(context: Users["context"], user: userwidgets.User.Creatable): Promise<User | undefined>
	export async function from(
		context: Users["context"],
		source: userwidgets.User | userwidgets.User.Creatable,
		extra?: Pick<User, "password">
	): Promise<User | undefined> {
		const now = isoly.DateTime.now()
		return userwidgets.User.is(source)
			? !extra
				? undefined
				: {
						...source,
						...extra,
						permissions: { [context.application]: flagly.parse(source.permissions) as userwidgets.User.Permissions },
						modified: now,
				  }
			: source.password.new != source.password.repeat
			? undefined
			: {
					...source,
					password: await Password.hash(source.password.new, context.secret),
					permissions: { [context.application]: flagly.parse(source.permissions) as userwidgets.User.Permissions },
					modified: now,
					created: now,
			  }
	}
}
