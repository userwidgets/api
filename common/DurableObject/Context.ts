import { Environment } from "../../Context/Environment"

export class Context {
	protected constructor(protected readonly state: DurableObjectState, protected readonly environment: Environment) {}
}
