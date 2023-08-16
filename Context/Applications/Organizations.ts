import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { filters } from "../filters"
import { Inviter } from "../Inviter"
import { Applications } from "./index"

export class Organizations {
	constructor(
		private readonly context: {
			applicationNamespace: DurableObjectNamespace
			userNamespace: DurableObjectNamespace
			applications: Applications
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
	private async removeUsers(id: userwidgets.Organization.Identifier, emails: userwidgets.Email[]): Promise<void> {
		const users = (
			await Promise.all(
				emails.map(
					async email => await this.user(email).get<userwidgets.User>(`user`, { application: this.context.referer })
				)
			)
		).filter(userwidgets.User.is)
		await Promise.all(
			users.map(
				async user =>
					await this.user(user.email).patch<userwidgets.User>(
						`user`,
						{
							...user,
							permissions: (({ [id]: _, ...permissions }) => permissions)(user.permissions),
						},
						{
							ifMatch: ["*"],
							application: this.context.referer,
							contentType: "application/json;charset=UTF-8",
						}
					)
			)
		)
	}
	async create(
		organization: userwidgets.Organization.Creatable,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.Organization | gracely.Error> {
		const result = await this.application().post<userwidgets.Organization>(`organization`, organization)
		return gracely.Error.is(result) || permissions == undefined
			? result
			: filters.organization(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async fetch(
		id: userwidgets.Organization.Identifier,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.Organization | gracely.Error> {
		const result = await this.application().get<userwidgets.Organization>(`organization/${id}`)
		return gracely.Error.is(result) || permissions == undefined
			? result
			: filters.organization(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async list(permissions?: userwidgets.User.Permissions): Promise<userwidgets.Organization[] | gracely.Error> {
		const result = await this.application().get<userwidgets.Organization[]>(`organization`)
		return gracely.Error.is(result) || permissions == undefined
			? result
			: result.reduce<userwidgets.Organization[]>(
					(result, organization) => result.concat(filters.organization(permissions, organization) ?? []),
					[]
			  )
	}
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable,
		entityTag: string,
		permissions?: userwidgets.User.Permissions
	): Promise<
		| {
				organization: userwidgets.Organization
				invites: { email: string; invite: string }[]
				removals: { email: string }[]
		  }
		| gracely.Error
	> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const current = await this.application().get<userwidgets.Organization>(`organization/${id}`)
		if (!userwidgets.Organization.is(current))
			result = current
		else {
			// let updated = await this.application().patch<userwidgets.Organization>(`organization/${id}`, organization, {
			// 	ifMatch: [entityTag],
			// 	contentType: "application/json",
			// })
			let updated: userwidgets.Organization | gracely.Error = {
				...current,
				users: organization.users ?? [],
			} as userwidgets.Organization
			if (!userwidgets.Organization.is(updated))
				result = updated
			else {
				updated =
					permissions == undefined
						? updated
						: filters.organization(permissions, updated) ?? gracely.client.unauthorized("forbidden")
				if (gracely.Error.is(updated))
					result = updated
				else {
					const users = {
						updated: updated.users,
						current: current.users,
					}
					const removed = current.users.filter(user => !users.updated.includes(user))
					const added = updated.users.filter(user => !users.current.includes(user))
					const invited = [...added, ...(organization.users?.filter(user => typeof user == "object") ?? [])].reduce(
						(result, invited) =>
							typeof invited == "string"
								? result.set(invited, ["user.view"])
								: result.set(invited.user, invited.permissions ?? ["user.view"]),
						new Map<userwidgets.Email, string[]>()
					)
					await this.removeUsers(id, removed)
					const invites = (
						await Promise.all(
							Array.from(invited.entries()).map(async ([user, permissions]) => {
								const invite = await this.context.inviter.create({
									email: user,
									active: !gracely.Error.is(await this.user(user).get<userwidgets.User>("user")),
									permissions:
										userwidgets.User.Permissions.set(userwidgets.User.Permissions.type, {}, id, ...permissions) ?? {},
								})
								return !invite ? undefined : { email: user, invite: invite }
							})
						)
					).filter((invite): invite is Exclude<typeof invite, undefined> => !!invite)
					result = { organization: updated, invites: invites, removals: removed.map(user => ({ email: user })) }
				}
			}
		}
		return result
	}
}
