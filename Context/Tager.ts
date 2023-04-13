import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import { Environment } from "./Environment"

export class Tager {
	#verifier?: model.User.Tag.Verifier | gracely.Error
	get verifier(): model.User.Tag.Verifier | gracely.Error {
		return (
			this.#verifier ??
			(this.#verifier = !this.environment.issuer
				? gracely.server.misconfigured("issuer", "issuer missing from configuration.")
				: !model.User.Key.isIssuer(this.environment.issuer)
				? gracely.server.misconfigured("issuer", "configured issuer is not implemented")
				: model.User.Tag.Verifier.create(this.environment.issuer))
		)
	}
	#issuer?: model.User.Tag.Issuer | gracely.Error
	get issuer(): model.User.Tag.Issuer | gracely.Error {
		return (this.#issuer ??= !this.referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !this.environment.issuer
			? gracely.server.misconfigured("issuer", "issuer is missing from configuration")
			: !model.User.Key.isIssuer(this.environment.issuer)
			? gracely.server.misconfigured("issuer", "configured issuer is not implemented.")
			: !this.environment.privateSecret
			? model.User.Tag.Issuer.create(this.environment.issuer, this.referer)
			: model.User.Tag.Issuer.create(this.environment.issuer, this.referer, this.environment.privateSecret))
	}
	private constructor(public readonly environment: Environment, private readonly referer: string | undefined) {}
	async tag(token: string, ...audience: string[]): Promise<model.User.Tag | undefined | gracely.Error> {
		return gracely.Error.is(this.verifier) ? this.verifier : await this.verifier.verify(token, ...audience)
	}
	static open(environment: Environment, referer: string | undefined): Tager {
		return new this(environment, referer)
	}
}
