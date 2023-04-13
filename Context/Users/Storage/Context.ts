import { Environment } from "../../Environment"

export interface Context {
	state: DurableObjectState
	environment: Environment
}
