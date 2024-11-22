import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { Email } from "../../services/Email"
import { filters } from "../filters"
import type { Context } from "../index"
import { Inviter } from "../Inviter"
import { Applications } from "./index"

export class Organizations {
	constructor(
		private readonly context: {
			userNamespace: DurableObjectNamespace
			applications: Applications
			inviter: Inviter
			referer: string
			services: Context["services"]
		},
		private readonly environment: {
			applicationNamespace: DurableObjectNamespace
			inviteParameterName: string | undefined
		}
	) {}
	private user(email: string): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.userNamespace, email)
	}
	private async fetchUser(email: userwidgets.Email): Promise<userwidgets.User | gracely.Error> {
		return await this.user(email).get<userwidgets.User>(`user`, {
			application: this.context.referer,
		})
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.environment.applicationNamespace, this.context.referer)
	}
	private async removeUsers(id: userwidgets.Organization.Identifier, emails: userwidgets.Email[]): Promise<void> {
		const users = (await Promise.all(emails.map(async email => await this.fetchUser(email)))).filter(
			userwidgets.User.is
		)
		await Promise.all(
			users.map(
				async user =>
					await this.user(user.email).patch<userwidgets.User>(
						`user`,
						{
							...user,
							permissions: userwidgets.User.Permissions.remove(user.permissions, id, false),
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
		organization: Omit<userwidgets.Organization.Creatable, "user">,
		permissions?: userwidgets.User.Permissions,
		options?: { url?: URL }
	): Promise<userwidgets.Organization | gracely.Error>
	async create(
		organization: userwidgets.Organization.Creatable,
		permissions?: userwidgets.User.Permissions,
		options?: { url?: URL }
	): Promise<Return<Organizations["update"]> | gracely.Error>
	async create(
		organization: userwidgets.Organization.Creatable,
		permissions?: userwidgets.User.Permissions,
		options?: { url?: URL }
	): Promise<userwidgets.Organization | Return<Organizations["update"]> | gracely.Error> {
		// ): Promise<userwidgets.Organization | gracely.Error | Return<Organizations["update"]>> {
		// TODO if user is defined on the creatable then fetch the application to see if self sign on is allowed
		let result: userwidgets.Organization | Return<Organizations["update"]> | gracely.Error
		if (!organization.user) {
			result = await this.application().post<userwidgets.Organization>(`organization`, organization)
			result =
				gracely.Error.is(result) || permissions == undefined
					? result
					: filters.organization(permissions, result) ?? gracely.client.unauthorized("forbidden")
		} else {
			const application = await this.context.applications.fetch(permissions)
			if (gracely.Error.is(application))
				result = application
			else if (!application.selfSignOn)
				result = gracely.client.unauthorized()
			else {
				const created = await this.create((({ user, ...organization }) => organization)(organization), permissions)
				if (gracely.Error.is(created))
					result = created
				else {
					result = await this.update(
						created.id,
						{ ...created, users: [...created.users, { user: organization.user, permissions: created.id }] },
						created.modified,
						permissions,
						options
					)
				}
			}
		}

		return result
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
		permissions?: userwidgets.User.Permissions,
		options?: { url?: URL }
	): Promise<
		| {
				organization: userwidgets.Organization
				invites: { email: string; invite: string }[]
				removals: { email: string }[]
		  }
		| gracely.Error
	> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const current = await this.fetch(id, undefined)
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
					const invited = [...added, ...(organization.users?.filter(user => typeof user == "object") ?? [])].reduce(
						(result, invited) =>
							typeof invited == "string"
								? result.set(invited, `${current.id}.user.view`)
								: result.set(invited.user, invited.permissions ?? `${current.id}.user.view`),
						new Map<userwidgets.Email, string>()
					)
					await this.removeUsers(id, removed)
					const invites = (
						await Promise.all(
							Array.from(invited.entries()).map(async ([user, permissions]) => {
								const invite = await this.context.inviter.create({
									email: user,
									active: !gracely.Error.is(await this.fetchUser(user)),
									permissions: permissions,
								})
								return !invite ? undefined : { email: user, invite: invite }
							})
						)
					).filter((invite): invite is Exclude<typeof invite, undefined> => !!invite)
					result = { organization: updated, invites: invites, removals: removed.map(user => ({ email: user })) }
					if (options?.url) {
						const email = (email =>
							!gracely.Error.is(email) ? email : { send: (..._: Parameters<Email["send"]>) => email })(
							await this.context.services.load.email()
						)
						const url = options.url
						result.invites.map(async invite => {
							const result = { ...invite }
							const inviteUrl = new URL(url.href)
							inviteUrl.searchParams.set(
								userwidgets.Configuration.addDefault(
									{ inviteParameterName: this.environment.inviteParameterName },
									"inviteParameterName"
								).inviteParameterName,
								invite.invite
							)
							Object.assign(result, {
								response: await email.send({
									subject: `You have been invited to join an organization.`,
									to: invite.email,
									content: { text: `Invitation: ${inviteUrl}` },
								}),
							})
						})
					}
				}
			}
		}
		return result
	}
}
