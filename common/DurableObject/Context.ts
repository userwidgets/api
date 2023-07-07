import { Environment } from "../../Context/Environment"

export class Context {
	private constructor(private readonly state: DurableObjectState, private readonly environment: Environment) {}
	static create(state: DurableObjectState, environment: Environment) {
		return new this(state, environment)
	}
}
