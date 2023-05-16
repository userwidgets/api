import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import { Environment } from "./Environment"

export class Tager {
	#verifier?: model.User.Invite.Verifier | gracely.Error
	private get verifier(): model.User.Invite.Verifier | gracely.Error {
		return (this.#verifier ??= !this.environment.publicKey
			? gracely.server.misconfigured("publicKey", "PublicKey missing from configuration.")
			: model.User.Invite.Verifier.create(this.environment.publicKey))
	}
	#issuer?: model.User.Invite.Issuer | gracely.Error
	get issuer(): model.User.Invite.Issuer | gracely.Error {
		return (this.#issuer ??= !this.referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !this.environment.issuer
			? gracely.server.misconfigured("issuer", "issuer is missing from configuration")
			: !this.environment.publicKey
			? gracely.server.misconfigured("publicKey", "PublicKey is missing from configuration")
			: !this.environment.privateKey
			? gracely.server.misconfigured("privateKey", "PrivateKey is missing from configuration")
			: model.User.Invite.Issuer.create(
					this.environment.issuer,
					this.referer,
					this.environment.publicKey,
					this.environment.privateKey
			  ))
	}
	private constructor(public readonly environment: Environment, private readonly referer: string) {}
	async verify(invite: string | undefined): Promise<model.User.Invite | gracely.Error | undefined> {
		return gracely.Error.is(this.verifier)
			? this.verifier
			: await this.verifier.verify(invite).then(invite => (invite?.audience != this.referer ? undefined : invite))
	}
	async invite(token: string, ...audience: string[]): Promise<model.User.Invite | undefined | gracely.Error> {
		return gracely.Error.is(this.verifier) ? this.verifier : await this.verifier.verify(token, ...audience)
	}
	static open(environment: Environment, referer: string | undefined): Tager | gracely.Error {
		return !referer ? gracely.client.missingHeader("Referer", "Referer required.") : new this(environment, referer)
	}
}
