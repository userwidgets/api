import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Environment } from "./Environment"

export class Authenticator {
	private constructor(
		private readonly environment: Environment,
		private readonly referer: string,
		private readonly issuer: model.User.Key.Issuer,
		private readonly verifier: model.User.Key.Verifier
	) {}
	async sign(key: model.User.Key.Creatable): Promise<string | undefined> {
		return this.issuer.sign(key)
	}
	async verify(token: string, ...audience: string[]): Promise<model.User.Key | undefined> {
		return this.verifier.verify(token, ...(audience.length ? audience : [this.referer]))
	}
	async authenticate<M extends "token" | "admin" | "user">(
		request: http.Request,
		...method: M[]
	): Promise<
		| (M extends "token" ? model.User.Key : never)
		| (M extends "admin" ? "admin" : never)
		| (M extends "user" ? model.User.Credentials : never)
		| undefined
	>
	async authenticate(
		request: http.Request,
		...method: ("token" | "admin" | "user")[]
	): Promise<"admin" | model.User.Key | model.User.Credentials | undefined> {
		return (
			(method.includes("token")
				? await this.verifier.authenticate(request.header.authorization, this.referer)
				: undefined) ??
			(method.includes("admin") &&
			this.environment.adminSecret &&
			request.header.authorization == `Basic ${this.environment.adminSecret}`
				? "admin"
				: method.includes("user")
				? model.User.Credentials.fromBasic(request.header.authorization)
				: undefined)
		)
	}
	static open(environment: Environment, referer: string | undefined): Authenticator | gracely.Error {
		return !environment.issuer
			? gracely.server.misconfigured("issuer", "Issuer is missing from configuration.")
			: !environment.publicKey
			? gracely.server.misconfigured("publicKey", "PublicKey is missing from configuration.")
			: !environment.privateKey
			? gracely.server.misconfigured("privateKey", "PrivateKey is missing from configuration.")
			: !referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: new this(
					environment,
					referer,
					model.User.Key.Issuer.create(
						environment.issuer,
						referer, // audience
						environment.publicKey,
						environment.privateKey
					),
					model.User.Key.Verifier.create(environment.publicKey)
			  )
	}
}
