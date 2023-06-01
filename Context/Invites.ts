import { cryptly } from "cryptly"
import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { storage } from "cloudly-storage"
import type { Context } from "./index"

export class Invites {
	private constructor(private store: storage.KeyValueStore<string>) {}
	async fetch(id: string): Promise<string | undefined> {
		return this.store.get(id).then(result => result?.value)
	}
	async create(token: string, retries: number): Promise<string | undefined>
	async create(key: userwidgets.User.Key.Creatable, retries: number): Promise<string | undefined>
	async create(token: string | userwidgets.User.Key.Creatable, retries = 5): Promise<string | undefined> {
		let result: string | undefined = undefined
		const id = cryptly.Identifier.generate(16)
		if (await this.fetch(id))
			result = await this.create(token, retries - 1)
		else {
			this.store.set(id, token, { retention: { days: 3 } })
			result = id
		}
		return result
	}
	static open(context: Context): Invites | gracely.Error {
		return gracely.Error.is(context.inviter)
			? context.inviter
			: gracely.Error.is(context.inviter.issuer)
			? context.inviter.issuer
			: !context.environment.store
			? gracely.server.misconfigured("store", "missing kv binding.")
			: new this(
					storage.KeyValueStore.partition<string>(storage.KeyValueStore.open(context.environment.store), "invite|")
			  )
	}
}
