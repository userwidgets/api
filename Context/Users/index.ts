import { flagly } from "flagly"
import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { Applications } from "../Applications"
import { filters } from "../filters"
import type { Context } from "../index"

export class Users {
	private constructor(
		private readonly context: {
			userNamespace: DurableObjectNamespace
			applicationNamespace: DurableObjectNamespace
			referer: string
			applications: Applications
		}
	) {}
	private user(email: string): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.userNamespace, email.toLowerCase())
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.applicationNamespace, this.context.referer)
	}
	private async syncOrganizations(email: string, permissions: userwidgets.User.Permissions | string): Promise<void> {
		userwidgets.User.Permissions.organizations(permissions)
		const organizations = (
			await Promise.all(
				userwidgets.User.Permissions.organizations(permissions).map(
					async id => await this.application().get<userwidgets.Organization>(`organization/${id}`)
				)
			)
		).filter(userwidgets.Organization.is)
		await Promise.all(
			organizations.map(
				async ({ id, users }) =>
					await this.application().patch<userwidgets.Organization>(
						`organization/${id}`,
						{
							users: [...users, email],
						},
						{ ifMatch: ["*"], contentType: "application/json;charset=UTF-8" }
					)
			)
		)
	}
	async create(
		user: userwidgets.User.Creatable,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		const permitted = await this.permittedInvites(user.email, user.permissions)
		let result: userwidgets.User | gracely.Error
		const created = await this.user(user.email).post<userwidgets.User>(
			`user`,
			{ ...user, permissions: permitted },
			{
				application: this.context.referer,
				contentType: "application/json;charset=UTF-8",
			}
		)
		if (gracely.Error.is(created))
			result = created
		else {
			await this.syncOrganizations(created.email, created.permissions)
			result =
				permissions == undefined
					? created
					: filters.user(permissions, created) ?? gracely.client.unauthorized("forbidden")
		}
		return result
	}
	async fetch(
		email: userwidgets.Email,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		const result = await this.user(email).get<userwidgets.User>(`user`, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
		return gracely.Error.is(result) || permissions == undefined
			? result
			: filters.user(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async authenticate(credentials: userwidgets.User.Credentials): Promise<userwidgets.User | gracely.Error> {
		return await this.user(credentials.user).post<userwidgets.User>(`user/authenticate`, credentials, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
	}
	private async permittedInvites(
		email: userwidgets.Email,
		permission: userwidgets.User.Permissions
	): Promise<userwidgets.User.Permissions>
	private async permittedInvites(email: userwidgets.Email, permission: string): Promise<string>
	private async permittedInvites(
		email: userwidgets.Email,
		permissions: userwidgets.User.Permissions | string
	): Promise<userwidgets.User.Permissions | string> {
		const parsed =
			typeof permissions == "object" ? permissions : (flagly.parse(permissions) as userwidgets.User.Permissions)
		const invitedOrganizationIds = userwidgets.User.Permissions.organizations(parsed)
		const organizations = (
			await Promise.all(invitedOrganizationIds.map(id => this.context.applications.organizations.fetch(id)))
		).filter(userwidgets.Organization.is)
		const result = {
			...(parsed["*"] && { "*": parsed["*"] }),
			...Object.fromEntries(
				Object.entries(parsed).filter(([id, _]) =>
					organizations
						.filter(organization => organization.users.includes(email))
						.some(organization => organization.id == id)
				)
			),
		}
		return typeof permissions == "object" ? result : flagly.Flags.stringify(result)
	}
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | gracely.Error> {
		const permitted = await this.permittedInvites(invite.email, invite.permissions)
		const result = await this.user(invite.email).patch<userwidgets.User>(
			`user`,
			{ ...invite, permissions: permitted },
			{
				application: this.context.referer,
				contentType: "application/json;charset=UTF-8",
			}
		)
		if (!gracely.Error.is(result))
			await this.syncOrganizations(result.email, result.permissions)
		return result
	}
	async update(
		email: userwidgets.Email,
		user: userwidgets.User.Changeable,
		entityTag: string,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		let result: Awaited<ReturnType<Users["update"]>>
		if (user.permissions && permissions && !userwidgets.User.Permissions.check(permissions, "*", "user.edit")) {
			const current = await this.fetch(email, undefined)
			if (gracely.Error.is(current))
				result = current
			else {
				const permitted = userwidgets.User.Permissions.organizations(permissions)
				const update = userwidgets.User.Permissions.organizations(current.permissions)
					.filter(id => !permitted.includes(id))
					.reduce(
						(result, id) =>
							userwidgets.User.Permissions.merge(result, userwidgets.User.Permissions.get(current.permissions, id)),
						userwidgets.User.Permissions.merge(
							user.permissions,
							userwidgets.User.Permissions.get(current.permissions, "*")
						)
					)
				const response = await this.update(
					email,
					{
						...user,
						permissions: update,
					},
					entityTag,
					undefined
				)
				result =
					permissions == undefined || gracely.Error.is(response)
						? response
						: filters.user(permissions, response) ?? gracely.client.unauthorized("forbidden")
			}
		} else {
			result = await this.user(email).patch<userwidgets.User>(`user`, user, {
				application: this.context.referer,
				ifMatch: [entityTag],
				contentType: "application/json;charset=UTF-8",
			})
			if (!gracely.Error.is(result) && result.permissions)
				await this.syncOrganizations(result.email, result.permissions)
		}
		return result
	}
	async list(permissions?: userwidgets.User.Permissions): Promise<userwidgets.User[] | gracely.Error> {
		let result: Awaited<ReturnType<Users["list"]>>
		const response = await this.application().get<userwidgets.Application>(`application`)
		if (gracely.Error.is(response))
			result = response
		else {
			result = (
				await Promise.all(
					Array.from(
						new Set(
							Object.values(response.organizations)
								.map(organization => organization.users)
								.flat()
						),
						async email => await this.fetch(email, undefined)
					)
				)
			).filter(userwidgets.User.is)
			result =
				permissions == undefined
					? result
					: result.reduce<userwidgets.User[]>(
							(result, user) =>
								userwidgets.User.Permissions.organizations(user.permissions).some(id =>
									userwidgets.User.Permissions.check(permissions, id, "user.view")
								)
									? result.concat(filters.user(permissions, user) ?? [])
									: result,
							[]
					  )
		}
		return result
	}
	static open(context: Context): Users | gracely.Error {
		return !context.referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !context.environment.userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: !context.environment.applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: gracely.Error.is(context.applications)
			? context.applications
			: new this({
					userNamespace: context.environment.userNamespace,
					applicationNamespace: context.environment.applicationNamespace,
					referer: context.referer,
					applications: context.applications,
			  })
	}
}
