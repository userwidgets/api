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
		else {
			const created = await User.from(this.context, user)
			if (!created)
				result = undefined
			else
				result = User.model(this.context, await this.set(created))
		}
		return result
	}
	async fetch(): Promise<userwidgets.User | undefined> {
		const result = await this.get()
		return result == undefined ? undefined : User.model(this.context, result)
	}
	async authenticate(credentials: userwidgets.User.Credentials): Promise<userwidgets.User.Key.Creatable | undefined> {
		let result: Awaited<ReturnType<Users["authenticate"]>>
		const current = await this.get()
		if (!current)
			result = undefined
		else if (!(await Password.verify(credentials.password, current.password, this.context.secret)))
			result = undefined
		else
			result = userwidgets.User.Key.Creatable.from(User.model(this.context, current))
		return result
	}
	async update(user: userwidgets.User.Changeable): Promise<userwidgets.User | undefined> {
		let result = await this.get()
		if (!result)
			result = undefined
		else {
			result = await User.update(this.context, result, user)
		}
		return !result ? undefined : User.model(this.context, await this.set(result))
	}
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | undefined> {
		let result: Awaited<ReturnType<Users["join"]>>
		const current = await this.get()
		if (!current)
			result = undefined
		else {
			result = User.model(this.context, await this.set(await User.update(this.context, current, invite)))
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
