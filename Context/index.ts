import * as gracely from "gracely"
import { FormData } from "cloudly-formdata"
import * as http from "cloudly-http"
import { router } from "../router"
import { Authenticator } from "./Authenticator"
import { Environment } from "./Environment"
import { Storage } from "./Storage"

export class Context {
	constructor(
		readonly environment: Environment,
		readonly authenticator: Authenticator = new Authenticator(environment),
		readonly storage: Storage = new Storage(environment)
	) {}
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
