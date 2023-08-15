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
			: result
					// is this needed?
					// .map(organization => filters.organization(permissions, organization))
					.reduce<userwidgets.Organization[]>(
						(result, organization) => result.concat(filters.organization(permissions, organization) ?? []),
						[]
					)
		// is this needed?
		// .filter(
		// 	organization =>
		// 		organization.id in permissions ||
		// 		userwidgets.User.Permissions.check(permissions, organization.id, "org.view")
		// )
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
			const response = await this.application().patch<userwidgets.Organization>(`organization/${id}`, organization, {
				ifMatch: [entityTag],
				contentType: "application/json",
			})
			if (!userwidgets.Organization.is(response))
				result = response
			else {
				const organization = permissions == undefined ? response : filters.organization(permissions, response)
				if (!organization)
					result = gracely.client.unauthorized("forbidden")
				else {
					const removed = current.users.filter(user => !organization?.users.includes(user))
					const added = organization.users.filter(user => !current.users.includes(user))
					const invites = (
						await Promise.all(
							added.map(async user => {
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
					result = { organization: organization, invites: invites, removals: removed.map(user => ({ email: user })) }
				}
			}
		}
		return result
	}
}
