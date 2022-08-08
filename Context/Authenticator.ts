import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Environment } from "./Environment"

export class Authenticator {
	#issuer?: model.User.Key.Issuer
	get issuer(): model.User.Key.Issuer {
		return (
			this.#issuer ??
			(this.#issuer =
				model.User.Key.isIssuer(this.environment.issuer) && this.environment.privateSecret
					? model.User.Key.Signed.Issuer.create(this.environment.issuer, this.environment.privateSecret)
					: this.environment.issuer
					? model.User.Key.Unsigned.Issuer.create(this.environment.issuer)
					: model.User.Key.Unsigned.Issuer.create("none"))
		)
	}
	#verifier?: model.User.Key.Verifier
	get verifier(): model.User.Key.Verifier {
		return (
			this.#verifier ??
			(this.#verifier = model.User.Key.isIssuer(this.environment.issuer)
				? model.User.Key.Signed.Verifier.create(this.environment.issuer)
				: model.User.Key.Unsigned.Verifier.create())
		)
	}

	createIssuer(audience: string) {
		return model.User.Key.isIssuer(this.environment.issuer) && this.environment.privateSecret
			? model.User.Key.Signed.Issuer.create(this.environment.issuer, this.environment.privateSecret, audience)
			: this.environment.issuer
			? model.User.Key.Unsigned.Issuer.create(this.environment.issuer, audience)
			: model.User.Key.Unsigned.Issuer.create("none")
	}

	constructor(public readonly environment: Environment) {}
	async authenticate(request: http.Request, method: "admin"): Promise<"admin" | undefined>
	async authenticate(request: http.Request, method: "token"): Promise<model.User.Key | undefined>
	async authenticate(request: http.Request, method: "user"): Promise<model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token")[]
	): Promise<"admin" | model.User.Key | undefined>
	async authenticate(
		request: http.Request,
		...method: ("token" | "user")[]
	): Promise<model.User.Key | model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "user")[]
	): Promise<"admin" | model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token" | "user")[]
	): Promise<"admin" | model.User.Key | model.User.Credentials | undefined>
	async authenticate(
		request: http.Request,
		...method: ("admin" | "token" | "user")[]
	): Promise<"admin" | model.User.Key | model.User.Credentials | undefined> {
		return (
			(method.some(m => m == "token") ? await this.verifier.authenticate(request.header.authorization) : undefined) ??
			(method.some(m => m == "admin") &&
			this.environment.adminSecret &&
			request.header.authorization == `Basic ${this.environment.adminSecret}`
				? "admin"
				: method.some(m => m == "user")
				? model.User.Credentials.fromBasic(request.header.authorization)
				: undefined)
		)
	}
}
