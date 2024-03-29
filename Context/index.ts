import * as gracely from "gracely"
import * as http from "cloudly-http"
import { common } from "../common"
import { router } from "../router"
import { Applications } from "./Applications"
import { Authenticator } from "./Authenticator"
import { Environment } from "./Environment"
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
	constructor(readonly environment: Environment, readonly request: http.Request) {}
	async email(
		recipient: string,
		subject: string,
		content: string,
		type = "text/plain",
		dry_run = false
	): Promise<http.Response | gracely.Error | gracely.Result> {
		// docs: https://api.mailchannels.net/tx/v1/documentation
		let result: http.Response | gracely.Error | gracely.Result
		if (!this.environment.email)
			(result = { status: 202 }) && console.log(`to: ${recipient}\n${subject}\n${content}\n\n`)
		else if (!this.environment.dkimDomain)
			result = gracely.server.misconfigured("dkimDomain", "dkimDomain missing from configuration.")
		else if (!this.environment.dkimSelector)
			result = gracely.server.misconfigured("dkimSelector", "dkimSelector missing from configuration.")
		else if (!this.environment.dkimPrivateKey)
			result = gracely.server.misconfigured("dkimPrivateKey", "dkimPrivateKey missing from configuration.")
		else {
			const request = http.Request.create({
				url: `https://api.mailchannels.net/tx/v1/send?${dry_run ? "dry_run=true" : ""}`,
				method: "POST",
				header: {
					contentType: "application/json",
				},
				body: {
					personalizations: [
						{
							to: [{ email: recipient }],
							dkim_domain: this.environment.dkimDomain,
							dkim_selector: this.environment.dkimSelector,
							dkim_private_key: this.environment.dkimPrivateKey,
						},
					],
					from: {
						email: this.environment.email,
						name: this.environment.emailName,
					},
					subject: subject,
					content: [
						{
							type: type,
							value: content,
						},
					],
				},
			})
			const response = await http.fetch(request)
			result = { ...response, body: await response.body }
		}
		return result
	}

	static async handle(request: Request, environment: Environment): Promise<Response> {
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
