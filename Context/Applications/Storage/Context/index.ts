import { Environment } from "../../../Environment"
import { Applications } from "./Applications"
import { Organizations } from "./Organizations"

export class Context {
	#applications?: Applications
	get applications(): Applications {
		return (this.#applications ??= Applications.create(this.state))
	}
	#organizations?: Organizations
	get organizations() {
		return (this.#organizations ??= Organizations.create(this.state, this))
	}
	private constructor(private state: DurableObjectState) {}
	static create(state: DurableObjectState, _: Environment) {
		return new this(state)
	}
}
