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
	// public for compatibility with other DO endpoints
	private constructor(public state: DurableObjectState, public environment: Environment) {}
	static create(state: DurableObjectState, environment: Environment) {
		return new this(state, environment)
	}
}
