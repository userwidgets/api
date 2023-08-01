import { userwidgets } from "@userwidgets/model"
import { common } from "../../../../../common"
import { Application } from "../Applications/Application"

export class Applications {
	private constructor(private readonly storage: { object: common.DurableObject<Application> }) {}
	async fetch(): Promise<userwidgets.Application | undefined> {
		return await this.storage.object.get("data")
	}
	async change(application: userwidgets.Application): Promise<userwidgets.Application> {
		return await this.storage.object.set("data", application)
	}
	static create(state: DurableObjectState): Applications {
		return new this({ object: new common.DurableObject<Application>(state.storage) })
	}
}
