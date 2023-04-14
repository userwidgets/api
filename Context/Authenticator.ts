import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Environment } from "./Environment"

export class Authenticator {
	#verifier?: model.User.Key.Verifier | gracely.Error
	get verifier(): model.User.Key.Verifier | gracely.Error {
		return (
			this.#verifier ??
			(this.#verifier = !this.environment.issuer
				? gracely.server.misconfigured("issuer", "Issuer is missing from configuration.")
				: !model.User.Key.isIssuer(this.environment.issuer)
				? gracely.server.misconfigured("issuer", "Configured issuer is not implemented.")
				: model.User.Key.Verifier.create(this.environment.issuer))
		)
	}
	#issuer?: model.User.Key.Issuer | gracely.Error
	get issuer(): model.User.Key.Issuer | gracely.Error {
		return (this.#issuer ??= !this.environment.issuer
			? gracely.server.misconfigured("issuer", "Issuer is missing from configuration.")
			: !model.User.Key.isIssuer(this.environment.issuer)
			? gracely.server.misconfigured("issuer", "Configured issuer is not implemented.")
			: !this.environment.privateSecret
			? model.User.Key.Issuer.create(this.environment.issuer, this.referer)
			: model.User.Key.Issuer.create(this.environment.issuer, this.referer, this.environment.privateSecret))
	}
	private constructor(private readonly environment: Environment, private readonly referer: string) {}
	async authenticate(request: http.Request, method: "admin"): Promise<"admin" | undefined>
	async authenticate(request: http.Request, method: "token"): Promise<model.User.Key | undefined | gracely.Error>
	async authenticate(request: http.Request, method: "user"): Promise<model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token")[]
	): Promise<"admin" | model.User.Key | undefined | gracely.Error>
	async authenticate(
		request: http.Request,
		...method: ("token" | "user")[]
	): Promise<model.User.Key | model.User.Credentials | undefined | gracely.Error>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "user")[]
	): Promise<"admin" | model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token" | "user")[]
	): Promise<"admin" | model.User.Key | model.User.Credentials | undefined | gracely.Error>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token" | "user")[]
	): Promise<"admin" | model.User.Key | model.User.Credentials | undefined | gracely.Error> {
		return (
			(method.some(m => m == "token")
				? gracely.Error.is(this.verifier)
					? this.verifier
					: await this.verifier
							.authenticate(request.header.authorization)
							.then(key => (key?.audience == this.referer ? undefined : key))
				: undefined) ??
			(method.some(m => m == "admin") &&
			this.environment.adminSecret &&
			request.header.authorization == `Basic ${this.environment.adminSecret}`
				? "admin"
				: method.some(m => m == "user")
				? model.User.Credentials.fromBasic(request.header.authorization)
				: undefined)
		)
	}
	static open(environment: Environment, referer: string | undefined): Authenticator | gracely.Error {
		return !referer ? gracely.client.missingHeader("Referer", "Referer required.") : new this(environment, referer)
	}
}
