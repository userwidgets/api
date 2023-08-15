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
			let updated = await this.application().patch<userwidgets.Organization>(`organization/${id}`, organization, {
				ifMatch: [entityTag],
				contentType: "application/json",
			})
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
					const needInvite = organization.users?.filter(userwidgets.Organization.Changeable.Invite.is)
					const sendInvitesTo = [...new Set([...added, ...(needInvite?.map(({ user }) => user) ?? [])])]
					const invites = (
						await Promise.all(
							sendInvitesTo.map(async user => {
								const invite = await this.context.inviter.create({
									email: user,
									active: !gracely.Error.is(await this.user(user).get<userwidgets.User>("user")),
									permissions: { [id]: { user: { view: true, invite: true } } },
								})
								return !invite ? undefined : { email: user, invite: invite }
							})
						)
					).filter((invite): invite is Exclude<typeof invite, undefined> => !!invite)
					await Promise.all(removed.map(async user => this.user(user).delete(`user`)))
					result = { organization: updated, invites: invites, removals: removed.map(user => ({ email: user })) }
				}
			}
		}
		return result
	}
}
