import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { http } from "cloudly-http"
import { Environment } from "./Environment"

export class Authenticator {
	private constructor(
		private readonly environment: Environment,
		private readonly referer: string,
		private readonly issuer: userwidgets.User.Key.Issuer,
		private readonly verifier: userwidgets.User.Key.Verifier
	) {}
	async sign(source: userwidgets.User.Key.Creatable | userwidgets.User): Promise<string | undefined> {
		return this.issuer.sign(userwidgets.User.Key.Creatable.from(source))
	}
	async verify(token: string, ...audience: string[]): Promise<userwidgets.User.Key | undefined> {
		return this.verifier.verify(token, ...(audience.length ? audience : [this.referer]))
	}
	async authenticate<M extends "token" | "admin" | "user">(
		request: http.Request,
		...method: M[]
	): Promise<
		| (M extends "token" ? userwidgets.User.Key : never)
		| (M extends "admin" ? "admin" : never)
		| (M extends "user" ? userwidgets.User.Credentials : never)
		| undefined
	>
	async authenticate(
		request: http.Request,
		...method: ("token" | "admin" | "user")[]
	): Promise<"admin" | userwidgets.User.Key | userwidgets.User.Credentials | undefined> {
		return (
			(method.includes("token")
				? await this.verifier.authenticate(request.header.authorization, this.referer)
				: undefined) ??
			(method.includes("admin") &&
			this.environment.adminSecret &&
			request.header.authorization == `Basic ${this.environment.adminSecret}`
				? "admin"
				: method.includes("user")
				? userwidgets.User.Credentials.fromBasic(request.header.authorization)
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
					userwidgets.User.Key.Issuer.create(
						environment.issuer,
						referer, // audience
						environment.publicKey,
						environment.privateKey
					),
					userwidgets.User.Key.Verifier.create(environment.publicKey)
			  )
	}
}
