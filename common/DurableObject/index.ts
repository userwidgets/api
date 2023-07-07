import { Client as DurableObjectClient } from "./Client"
import { Context as DurableObjectContext } from "./Context"
export class DurableObject<T> {
	constructor(private readonly storage: DurableObjectStorage, private readonly prefix: string = "") {}
	async get(key: string, options?: DurableObjectGetOptions): Promise<T | undefined> {
		return this.storage.get<T>(this.prefix + key, options)
	}
	async set(key: string, value: T): Promise<T> {
		return await this.storage.put<T>(this.prefix + key, value), value
	}
	async list(options?: DurableObjectListOptions): Promise<Map<string, T>> {
		return await this.storage.list<T>({ ...options, prefix: this.prefix + (options?.prefix ?? "") })
	}
}
export namespace DurableObject {
	export type Client = DurableObjectClient
	export const Client = DurableObjectClient
	export type Context = DurableObjectContext
}
