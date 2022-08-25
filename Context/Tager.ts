import * as model from "@userwidgets/model"
import { Environment } from "./Environment"

export class Tager {
	#verifier?: model.User.Tag.Verifier
	get verifier(): model.User.Tag.Verifier {
		return (
			this.#verifier ??
			(this.#verifier = model.User.Key.isIssuer(this.environment.issuer)
				? model.User.Tag.Signed.Verifier.create(this.environment.issuer)
				: model.User.Tag.Unsigned.Verifier.create())
		)
	}
	constructor(public readonly environment: Environment) {}
	createIssuer(audience: string) {
		return model.User.Key.isIssuer(this.environment.issuer) && this.environment.privateSecret
			? model.User.Tag.Signed.Issuer.create(this.environment.issuer, this.environment.privateSecret, audience)
			: this.environment.issuer
			? model.User.Tag.Unsigned.Issuer.create(this.environment.issuer, audience)
			: model.User.Tag.Unsigned.Issuer.create("none")
	}
	async tag(token: string, ...audience: string[]): Promise<model.User.Tag | undefined> {
		return await this.verifier.verify(token, ...audience)
	}
}
