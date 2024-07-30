import { gracely } from "gracely"
import { http } from "cloudly-http"
import { common } from "../common"
import { router } from "../router"
import { services } from "../services"
import { Applications } from "./Applications"
import { Authenticator } from "./Authenticator"
import { Environment as ContextEnvironment } from "./Environment"
import { Inviter } from "./Inviter"
import { Users } from "./Users"

export class Context {
	#referer?: string
	get referer(): string | undefined {
		return (this.#referer ??=
			typeof this.request.header.application == "string"
				? common.url.parse(this.request.header.application)?.hostname ?? this.request.header.application
				: common.url.parse(this.request.header.referer)?.hostname ?? this.request.header.referer)
	}
	#applications?: Applications | gracely.Error
	get applications(): Applications | gracely.Error {
		return (this.#applications ??= Applications.open(this))
	}
	#users?: Users | gracely.Error
	get users(): Users | gracely.Error {
		return (this.#users ??= Users.open(this))
	}
	#authenticator?: Authenticator | gracely.Error
	get authenticator(): Authenticator | gracely.Error {
		return (this.#authenticator ??= Authenticator.open(this.environment, this.referer))
	}
	#inviter?: Inviter | gracely.Error
	get inviter(): Inviter | gracely.Error {
		return (this.#inviter ??= Inviter.open(this.environment, this.referer))
	}
	constructor(readonly environment: Context.Environment, readonly request: http.Request) {}
	services = {
		load: {
			email: async (): Promise<services.Email | gracely.Error> => {
				return await services.Email.load(this, this.environment)
			},
		},
	}

	static async handle(request: Request, environment: Context.Environment): Promise<Response> {
		let result: http.Response
		try {
			const httpRequest = http.Request.from(request)
			result = await router.handle(httpRequest, new Context(environment, httpRequest))
		} catch (e) {
			console.log(e)
			const details = (typeof e == "object" && e && e.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return await http.Response.to({
			...result,
			header: { ...result.header, accessControlAllowOrigin: result.header.accessControlAllowOrigin ?? "*" },
		})
	}
}
export namespace Context {
	export import Environment = ContextEnvironment
}
