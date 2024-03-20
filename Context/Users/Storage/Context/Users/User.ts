import { cryptly } from "cryptly"
import { flagly } from "flagly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
import type { Users } from "./index"
import { Password } from "./Password"
import { Permissions } from "./Permissions"
import { twoFactor } from "./twoFactor"

export interface User extends Omit<userwidgets.User.Creatable, "password" | "permissions"> {
	permissions: Permissions
	password: cryptly.Password.Hash
	created: isoly.DateTime
	modified: isoly.DateTime | { other: isoly.DateTime; password: isoly.DateTime }
	twoFactor?: { key?: string; recoveryCodes?: cryptly.Password.Hash[] }
}
export namespace User {
	export const type = isly.object<User>({
		email: userwidgets.Email.type,
		name: userwidgets.User.Name.type,
		permissions: Permissions.type,
		password: isly.fromIs("cryptly.Password.Hash", cryptly.Password.Hashed.is),
		created: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
		modified: isly.union(
			isly.fromIs("isoly.DateTime", isoly.DateTime.is),
			isly.object({
				other: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
				password: isly.fromIs("isoly.DateTime", isoly.DateTime.is),
			})
		),
		twoFactor: isly
			.object<Required<User>["twoFactor"]>({
				key: isly.string().optional(),
				recoveryCodes: isly.fromIs("Hash", cryptly.Password.Hashed.is).array().optional(),
			})
			.optional(),
	})
	export function model(context: Users["context"], user: User): userwidgets.User {
		return (({ password, permissions, ...user }) => ({
			...user,
			permissions: flagly.Flags.stringify(permissions[context.application] ?? {}),
			twoFactor: user.twoFactor ? true : false,
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
		let password: cryptly.Password.Hash | undefined
		if (userwidgets.User.Invite.is(patch))
			result = {
				...source,
				permissions: {
					...source.permissions,
					[context.application]: userwidgets.User.Permissions.merge(
						source.permissions[context.application] ?? {},
						patch.permissions
					),
				},
			}
		else if (
			!(password = !patch.password
				? source.password
				: patch.password.new != patch.password.repeat
				? undefined
				: "old" in patch.password && !(await Password.verify(patch.password.old, source.password, context.secret))
				? undefined
				: await Password.hash(patch.password.new, context.secret))
		)
			result = undefined
		else {
			result = {
				...source,
				...(patch.name && { name: patch.name }),
				...(patch.permissions != undefined && {
					permissions: {
						...source.permissions,
						[context.application]: flagly.parse(patch.permissions) as userwidgets.User.Permissions,
					},
				}),
				password,
				twoFactor: patch.twoFactor
					? {
							key: patch.twoFactor?.key,
							recoveryCodes: await twoFactor.hash(patch.twoFactor?.recoveryCodes, context.secret),
					  }
					: source.twoFactor,
				modified: {
					other: isoly.DateTime.now(),
					password:
						patch.password || typeof source.modified != "object" ? isoly.DateTime.now() : source.modified.password,
				},
			}
		}
		return result
	}
	export async function create(context: Users["context"], user: userwidgets.User.Creatable): Promise<User | undefined> {
		const now = isoly.DateTime.now()
		return user.password.new != user.password.repeat
			? undefined
			: {
					...user,
					password: await Password.hash(user.password.new, context.secret),
					permissions: { [context.application]: flagly.parse(user.permissions) as userwidgets.User.Permissions },
					modified: now,
					created: now,
			  }
	}
}
