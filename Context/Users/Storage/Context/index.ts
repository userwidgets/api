import { gracely } from "gracely"
import { http } from "cloudly-http"
import { Environment } from "../../../Environment"
import { Inviter } from "../../../Inviter"
import { Users } from "./Users"

export class Context {
	#application: string | undefined
	get application(): string | undefined {
		return (this.#application ??= Array.isArray(this.request.header.application)
			? undefined
			: this.request.header.application)
	}
	#inviter?: Inviter | gracely.Error
	get inviter(): Inviter | gracely.Error {
		return (this.#inviter ??= Inviter.open(this.environment, this.application))
	}
	#users?: Users | gracely.Error
	get users() {
		return (this.#users ??= Users.create(this.state, this, this.environment))
	}
	// public for compatibility with other DO endpoints
	private constructor(
		private state: DurableObjectState,
		private environment: Environment,
		public request: http.Request
	) {}
	static create(state: DurableObjectState, environment: Environment, request: http.Request) {
		return new this(state, environment, request)
	}
}
