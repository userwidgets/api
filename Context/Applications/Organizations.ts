import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { isly } from "isly"
import { common } from "../../common"
import { Inviter } from "../Inviter"

namespace Response {
	export type Post = userwidgets.Organization
	export type Get = userwidgets.Organization
	export type List = userwidgets.Organization[]
	export namespace List {
		export const type = isly.array(userwidgets.Organization.type)
	}
	export type Patch = {
		new: userwidgets.Organization
		old: userwidgets.Organization
	}
	export namespace Patch {
		export const type = isly.object<Patch>({
			new: userwidgets.Organization.type,
			old: userwidgets.Organization.type,
		})
	}
}

export class Organizations {
	constructor(
		private readonly context: {
			applicationNamespace: DurableObjectNamespace
			userNamespace: DurableObjectNamespace
			inviter: Inviter
			referer: string
		}
	) {}
	private user(email: string): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.userNamespace, email)
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.applicationNamespace, this.context.referer)
	}
	async create(organization: userwidgets.Organization.Creatable): Promise<userwidgets.Organization | gracely.Error> {
		return await this.application().post<Response.Post>(`organization`, organization)
	}
	async fetch(id: userwidgets.Organization.Identifier): Promise<userwidgets.Organization | gracely.Error> {
		return await this.application().get<Response.Get>(`organization/${id}`)
	}
	async list(ids?: userwidgets.Organization.Identifier[]): Promise<userwidgets.Organization[] | gracely.Error> {
		const search = ids?.map(id => `id=${id}`).join("&")
		return await this.application().get<Response.List>(`organization?${search}`)
	}
	// continue here when coming back
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable,
		url?: URL
	): Promise<userwidgets.Organization | gracely.Error> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const response = await this.application().patch<Response.Patch>(`organization/${id}`, organization)
		if (!Response.Patch.type.is(response))
			result = response
		else {
			// send invites instead. do not force invite a user without interaction.
			result = response.new
			const existing = (
				organization.users &&
				(await Promise.all(
					organization.users.map(async email => [await this.user(email).get<userwidgets.User>("user"), email] as const)
				))
			)?.reduce(
				(result, [response, email]) => (gracely.Error.is(response) ? result : result.add(email)),
				new Set<string>()
			)
			// send invites instead. do not force invite a user without interaction.
			await Promise.all(
				response.old.users
					.filter(email => !response.new.users.includes(email))
					.map(
						async email =>
							existing?.has(email) && this.user(email).patch<userwidgets.User>(`user`, { permissions: { [id]: false } })
					)
			)
			// send invites instead. do not force invite a user without interaction.
			const newUsers = await Promise.all(
				response.new.users.filter(email => !response.old.users.includes(email))
				// .map(async email => this.user(email).post<userwidgets.User>(`user`, { permissions: { [id]: {} } }))
			)
			// .filter(userwidgets.User.is)
			// .map(async user => existing?.has)
			// .filter(userwidgets.User.is).map(user => existing)
		}
		return result
	}
}
