import { gracely } from "gracely"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../../../../common"
import { Environment } from "../../../../Environment"
import type { Context } from "../index"
import { Password } from "./Password"
import { User } from "./User"

export class Users {
	private cache?: User
	private get: () => Promise<User | undefined>
	private set: (user: Omit<User, "modified">) => Promise<User>
	private constructor(
		storage: { object: common.DurableObject<User> },
		private readonly context: { application: string; secret: string }
	) {
		this.get = async () => (this.cache ??= await storage.object.get("data"))
		this.set = async user =>
			(this.cache = await storage.object.set("data", { ...user, modified: isoly.DateTime.now() }))
	}
	async create(user: userwidgets.User.Creatable): Promise<userwidgets.User | undefined> {
		let result: userwidgets.User | undefined
		if (await this.get())
			result = undefined
		else
			result = User.model(
				await this.set({
					...user,
					password: await Password.hash(user.password.new, this.context.secret),
					permissions: { [this.context.application]: user.permissions },
					created: isoly.DateTime.now(),
				}),
				this.context.application
			)
		return result
	}
	async fetch(): Promise<userwidgets.User | undefined> {
		const result = await this.get()
		return result == undefined ? undefined : User.model(result, this.context.application)
	}
	async authenticate(credentials: userwidgets.User.Credentials): Promise<userwidgets.User.Key.Creatable | undefined> {
		let result: Awaited<ReturnType<Users["authenticate"]>>
		const current = await this.get()
		if (!current)
			result = undefined
		else if (!(await Password.verify(credentials.password, current.password, this.context.secret)))
			result = undefined
		else
			result = userwidgets.User.Key.Creatable.from(User.model(current, this.context.application))
		return result
	}
	async update(user: userwidgets.User.Changeable): Promise<userwidgets.User | undefined> {
		const { name, permissions, password } = user
		let result = await this.get()
		if (!result)
			result = undefined
		else {
			if (name != undefined)
				result.name = name

			if (permissions != undefined)
				result.permissions[this.context.application] = {
					...permissions,
				}

			if (password != undefined)
				if (!("old" in password))
					result.password = await Password.hash(password.new, this.context.secret)
				else if (!(await Password.verify(password.old, result.password, this.context.secret)))
					result = undefined
				else
					result.password = await Password.hash(password.new, this.context.secret)
		}
		return !result ? undefined : User.model(await this.set(result), this.context.application)
	}
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | undefined> {
		let result: Awaited<ReturnType<Users["join"]>>
		const current = await this.get()
		if (!current)
			result = undefined
		else {
			const permissions = userwidgets.User.Permissions.merge(
				current.permissions[this.context.application] ?? {},
				invite.permissions
			)
			if (!permissions)
				result = undefined
			else {
				current.permissions[this.context.application] = permissions
				result = User.model(await this.set(current), this.context.application)
			}
		}
		return result
	}
	static create(state: DurableObjectState, context: Context, environment: Environment): Users | gracely.Error {
		return !context.application
			? gracely.client.missingHeader("Application", "Application is required for this endpoint.")
			: !environment.hashSecret
			? gracely.server.misconfigured("hashSecret", "hasSecret is not set in worker environment.")
			: new this(
					{ object: new common.DurableObject<User>(state.storage) },
					{ application: context.application, secret: environment.hashSecret }
			  )
	}
}
