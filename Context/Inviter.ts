import { cryptly } from "cryptly"
import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import { storage } from "cloudly-storage"
import { Environment } from "./Environment"

export class Inviter {
	private constructor(
		private readonly store: storage.KeyValueStore<model.User.Invite.Creatable>,
		private readonly referer: string,
		private readonly issuer: model.User.Invite.Issuer,
		private readonly verifier: model.User.Invite.Verifier
	) {}
	async fetch(id: string): Promise<string | undefined> {
		return this.store.get(id).then(result => (!result?.value ? undefined : this.sign(result.value)))
	}
	async create(invite: model.User.Invite.Creatable, retries = 5): Promise<string | undefined> {
		let result: string | undefined
		const id = cryptly.Identifier.generate(16)
		if ((await this.fetch(id)) && retries)
			result = await this.create(invite, retries - 1)
		else {
			await this.store.set(id, invite, { retention: { days: 3 } })
			result = id
		}
		return result
	}
	async sign(invite: model.User.Invite.Creatable): Promise<string | undefined> {
		return this.issuer.sign(invite)
	}
	async verify(
		token: string | undefined,
		...audience: string[]
	): Promise<model.User.Invite | undefined | gracely.Error> {
		return this.verifier.verify(token, ...(audience.length ? audience : [this.referer]))
	}
	static open(environment: Environment, referer: string | undefined): Inviter | gracely.Error {
		return !environment.userwidgetsStore
			? gracely.server.misconfigured("userwidgetsStore", "missing kv binding.")
			: !referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !environment.issuer
			? gracely.server.misconfigured("issuer", "issuer is missing from configuration")
			: !environment.publicKey
			? gracely.server.misconfigured("publicKey", "PublicKey is missing from configuration")
			: !environment.privateKey
			? gracely.server.misconfigured("privateKey", "PrivateKey is missing from configuration")
			: new this(
					storage.KeyValueStore.partition(
						storage.KeyValueStore.Json.create<model.User.Invite.Creatable>(
							storage.KeyValueStore.open(environment.userwidgetsStore)
						),
						"invite|"
					),
					referer,
					model.User.Invite.Issuer.create(environment.issuer, referer, environment.publicKey, environment.privateKey),
					model.User.Invite.Verifier.create(environment.publicKey)
			  )
	}
}
