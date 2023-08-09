import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { Inviter } from "../Inviter"

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
		return await this.application().post<userwidgets.Organization>(`organization`, organization)
	}
	async fetch(id: userwidgets.Organization.Identifier): Promise<userwidgets.Organization | gracely.Error> {
		return await this.application().get<userwidgets.Organization>(`organization/${id}`)
	}
	async list(ids?: userwidgets.Organization.Identifier[]): Promise<userwidgets.Organization[] | gracely.Error> {
		const search = ids?.map(id => `id=${id}`).join("&")
		return await this.application().get<userwidgets.Organization[]>(`organization?${search}`)
	}
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable,
		entityTag: string
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
			const response = await this.application().patch<userwidgets.Organization>(`organization/${id}`, organization, {
				ifMatch: [entityTag],
				contentType: "application/json",
			})
			if (!userwidgets.Organization.is(response))
				result = response
			else {
				const removed = current.users.filter(user => !response.users.includes(user))
				const added = response.users.filter(user => !current.users.includes(user))
				// needInvite = added (maybe some of them) + reinvites (all)
				const needInvite = organization.users?.filter(userwidgets.Organization.Changeable.Invite.is)
				// sendInvitesTo = added (all) + reinvites (all)
				const sendInvitesTo = [...new Set([...added, ...(needInvite?.map(({ user }) => user) ?? [])])]
				const invites = (
					await Promise.all(
						sendInvitesTo.map(async user => {
							const invite = await this.context.inviter.create({
								email: user,
								active: !gracely.Error.is(await this.user(user).get<userwidgets.User>("user")),
								permissions: { [id]: { user: { read: true, write: true } } },
							})
							return !invite ? undefined : { email: user, invite: invite }
						})
					)
				).filter((invite): invite is Exclude<typeof invite, undefined> => !!invite)
				await Promise.all(removed.map(async user => this.user(user).delete(`user`)))
				result = { organization: response, invites: invites, removals: removed.map(user => ({ email: user })) }
			}
		}
		return result
	}
}
