import * as gracely from "gracely"
import { FormData } from "cloudly-formdata"
import * as http from "cloudly-http"
import { router } from "../router"
import { Authenticator } from "./Authenticator"
import { Environment } from "./Environment"
import { Storage } from "./Storage"
import { Tager } from "./Tager"

export class Context {
	constructor(
		readonly environment: Environment,
		readonly authenticator: Authenticator = new Authenticator(environment),
		readonly storage: Storage = new Storage(environment),
		readonly tager: Tager = new Tager(environment)
	) {}
	async email(recipient: string, subject: string, content: string, type = "text/plain", dry_run = false) {
		// docs: https://api.mailchannels.net/tx/v1/documentation
		let result: gracely.Result | gracely.Error
		if (!this.environment.email)
			(result = gracely.success.noContent()) && console.log(`to: ${recipient}\n${subject}\n${content}\n\n`)
		else {
			const request = http.Request.create({
				url: `https://api.mailchannels.net/tx/v1/send?dry_run=${dry_run}`,
				method: "POST",
				header: {
					contentType: "application/json",
				},
				body: {
					personalizations: [
						{
							to: [{ email: recipient }],
						},
					],
					from: {
						email: this.environment.email,
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
			result = http.Response.from(await fetch(request.url.toString(), await http.Request.to(request)))
		}
		return result
	}

	static async handle(request: Request, environment: Environment): Promise<Response> {
		let result: http.Response
		try {
			result = await router.handle(http.Request.from(request), new Context(environment))
		} catch (e) {
			const details = (typeof e == "object" && e && e.toString()) || undefined
			result = http.Response.create(gracely.server.unknown(details, "exception"))
		}
		return http.Response.to(result)
	}
}

http.Parser.add(
	async request =>
		Object.fromEntries(
			(
				await FormData.parse(
					new Uint8Array(await request.arrayBuffer()),
					request.headers.get("Content-Type") ?? "multipart/form-data"
				)
			).entries()
		),
	"multipart/form-data"
)
