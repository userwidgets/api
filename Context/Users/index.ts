import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { Environment } from "../Environment"

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
	private filter(permissions: userwidgets.User.Permissions, user: userwidgets.User): userwidgets.User | undefined {
		let result: ReturnType<Users["filter"]> = user
		if (!userwidgets.User.Permissions.check(permissions, "*", "user.read")) {
			const organizations = Object.keys((({ "*": _, ...permissions }) => permissions)(permissions))
			const common = organizations.filter(
				organization =>
					organization in user.permissions && userwidgets.User.Permissions.check(permissions, organization, "user.read")
			)
			if (!common.length)
				result = undefined
			else {
				result.permissions = Object.fromEntries(Object.entries(user.permissions).filter(([id]) => common.includes(id)))
			}
		}
		return result
	}
	async create(
		user: userwidgets.User.Creatable,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		const result = await this.user(user.email).post<userwidgets.User>(`user`, user, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
		return gracely.Error.is(result) || permissions == undefined
			? result
			: this.filter(permissions, result) ?? gracely.client.unauthorized("forbidden")
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
			: this.filter(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async authenticate(credentials: userwidgets.User.Credentials): Promise<userwidgets.User | gracely.Error> {
		return await this.user(credentials.user).post<userwidgets.User>(`user/authenticate`, credentials, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
	}
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | gracely.Error> {
		return await this.user(invite.email).patch(`user`, invite, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
	}
	async update(
		email: userwidgets.Email,
		user: userwidgets.User.Changeable,
		entityTag: string,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.User | gracely.Error> {
		const result = await this.user(email).patch<userwidgets.User>(`user`, user, {
			application: this.context.referer,
			ifMatch: [entityTag],
			contentType: "application/json;charset=UTF-8",
		})
		return gracely.Error.is(result) || permissions == undefined
			? result
			: this.filter(permissions, result) ?? gracely.client.unauthorized("forbidden")
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
							(result, user) => [...result, ...[this.filter(permissions, user) ?? []].flat()],
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
