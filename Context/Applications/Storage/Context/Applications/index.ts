import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../../../../common"
import { Application } from "../Applications/Application"

export class Applications {
	private cache?: Application
	get: () => Promise<Application | undefined>
	set: (application: Omit<Application, "modified">) => Promise<Application>
	private constructor(storage: { object: common.DurableObject<Application> }) {
		this.get = async () => (this.cache ??= await storage.object.get("data"))
		this.set = async application =>
			(this.cache = await storage.object.set("data", { ...application, modified: isoly.DateTime.now() }))
	}
	async fetch(): Promise<userwidgets.Application | undefined> {
		const result = await this.get()
		return !result ? undefined : Application.model(result)
	}
	async change(application: userwidgets.Application): Promise<userwidgets.Application> {
		return Application.model(await this.set(Application.from(application)))
	}
	async create(
		application: userwidgets.Application.Creatable & { id: userwidgets.Application.Identifier }
	): Promise<userwidgets.Application | undefined> {
		let result: userwidgets.Application | undefined
		if (await this.get())
			result = undefined
		else
			result = Application.model(await this.set(Application.from(application)))
		return result
	}
	static create(state: DurableObjectState): Applications {
		return new this({ object: new common.DurableObject<Application>(state.storage) })
	}
}
