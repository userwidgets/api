import { Client as DurableObjectClient } from "./Client"
export class DurableObject<T> {
	constructor(private readonly storage: DurableObjectStorage, private readonly prefix: string = "") {}
	async get(key: string, options?: DurableObjectGetOptions): Promise<T | undefined> {
		return this.storage.get<T>(this.prefix + key, options)
	}
	async delete(key: string): Promise<boolean> {
		return this.storage.delete(this.prefix + key)
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
}
