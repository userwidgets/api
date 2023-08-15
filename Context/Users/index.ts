import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { Environment } from "../Environment"
import { filters } from "../filters"

export class Users {
	private constructor(
		private readonly context: {
			userNamespace: DurableObjectNamespace
			applicationNamespace: DurableObjectNamespace
			referer: string
		}
	) {}
	private user(email: string): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.userNamespace, email.toLowerCase())
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.applicationNamespace, this.context.referer)
	}
	private async syncUser(email: string, permissions: userwidgets.User.Permissions): Promise<void> {
		const organizations = (
			await Promise.all(
				Object.keys((({ "*": _, ...permissions }) => permissions)(permissions)).map(
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
		let result: userwidgets.User | gracely.Error
		const created = await this.user(user.email).post<userwidgets.User>(`user`, user, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
		if (gracely.Error.is(created))
			result = created
		else {
			await this.syncUser(created.email, created.permissions)
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
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | gracely.Error> {
		const result = await this.user(invite.email).patch<userwidgets.User>(`user`, invite, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
		if (!gracely.Error.is(result))
			await this.syncUser(result.email, result.permissions)
		return result
	}
	async update(
		email: userwidgets.Email,
		user: userwidgets.User.Changeable,
		entityTag: string,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		let result: Awaited<ReturnType<Users["update"]>>
		const updated = await this.user(email).patch<userwidgets.User>(`user`, user, {
			application: this.context.referer,
			ifMatch: [entityTag],
			contentType: "application/json;charset=UTF-8",
		})
		if (gracely.Error.is(updated))
			result = updated
		else {
			if (user.permissions)
				await this.syncUser(updated.email, updated.permissions)
			result =
				permissions == undefined
					? updated
					: filters.user(permissions, updated) ?? gracely.client.unauthorized("forbidden")
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
						async email =>
							await this.user(email).get<userwidgets.User>(`user`, {
								application: this.context.referer,
								contentType: "application/json;charset=UTF-8",
							})
					)
				)
			).filter(userwidgets.User.is)
			result =
				permissions == undefined
					? result
					: result.reduce<userwidgets.User[]>(
							(result, user) =>
								Object.keys(user.permissions).some(id =>
									userwidgets.User.Permissions.check(permissions, id, "user.view")
								)
									? result.concat(filters.user(permissions, user) ?? [])
									: result,
							[]
					  )
		}
		return result
	}
	static open(environment: Environment, referer: string | undefined): Users | gracely.Error {
		return !referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !environment.userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: !environment.applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: new this({
					userNamespace: environment.userNamespace,
					applicationNamespace: environment.applicationNamespace,
					referer,
			  })
	}
}
