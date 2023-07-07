import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import { common } from "../../common"
import { Environment } from "../Environment"

export class Users {
	private constructor(
		private readonly userNamespace: DurableObjectNamespace,
		private readonly applicationNamespace: DurableObjectNamespace,
		private readonly referer: string
	) {}
	async create(user: model.User.Creatable): Promise<model.User.Key.Creatable | gracely.Error> {
		const created = await common.DurableObject.Client.open(
			this.userNamespace,
			user.email.toLowerCase()
		).post<model.User>("user", user, { application: this.referer, contentType: "application/json;charset=UTF-8" })
		let result: model.User.Key.Creatable | gracely.Error = gracely.Error.is(created)
			? created
			: model.User.toKey(created, this.referer) ?? gracely.client.notFound()
		if (!gracely.Error.is(result) && result.permissions["*"]?.application?.read) {
			const application = await common.DurableObject.Client.open(
				this.applicationNamespace,
				this.referer
			).get<model.Application>("application")
			gracely.Error.is(application)
				? (result = application)
				: (result.permissions = {
						...Object.fromEntries(Object.keys(application.organizations).map(id => [id, {}])),
						...result.permissions,
				  })
		}
		return result
	}
	async update(invite: model.User.Invite): Promise<model.User.Key.Creatable | gracely.Error> {
		const user = await common.DurableObject.Client.open(
			this.userNamespace,
			invite.email.toLowerCase()
		).patch<model.User>("user", invite)
		let result: model.User.Key.Creatable | gracely.Error = gracely.Error.is(user)
			? user
			: model.User.toKey(user, invite.audience) ?? gracely.client.notFound()
		if (!gracely.Error.is(result) && result.permissions["*"]?.application?.read) {
			const application = await common.DurableObject.Client.open(
				this.applicationNamespace,
				invite.audience
			).get<model.Application>("application")
			gracely.Error.is(application)
				? (result = application)
				: (result.permissions = {
						...Object.fromEntries(Object.keys(application.organizations).map(id => [id, {}])),
						...result.permissions,
				  })
		}
		return result
	}
	async authenticate(credentials: model.User.Credentials): Promise<model.User.Key.Creatable | gracely.Error> {
		const user = await common.DurableObject.Client.open(
			this.userNamespace,
			credentials.user.toLowerCase()
		).post<model.User>("user/authenticate", credentials)
		let result: model.User.Key.Creatable | gracely.Error = gracely.Error.is(user)
			? user
			: model.User.toKey(user, this.referer) ?? gracely.client.notFound()
		if (!gracely.Error.is(result) && result.permissions["*"]?.application?.read) {
			const application = await common.DurableObject.Client.open(
				this.applicationNamespace,
				this.referer
			).get<model.Application>("application")
			gracely.Error.is(application)
				? (result = application)
				: (result.permissions = {
						...Object.fromEntries(Object.keys(application.organizations).map(id => [id, {}])),
						...result.permissions,
				  })
		}
		return result
	}
	async list(organizationIds: string[] | undefined): Promise<Required<model.User.Readable[]> | gracely.Error> {
		const response = await common.DurableObject.Client.open(
			this.applicationNamespace,
			this.referer
		).get<model.Application>("application")
		return gracely.Error.is(response)
			? response
			: (
					await Promise.all(
						Array.from(
							new Set(
								Object.values(response.organizations)
									.map(organization => organization.users)
									.flat()
							),
							async email =>
								await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).get<model.User>("user")
						)
					)
			  )
					.filter((response): response is model.User => model.User.is(response))
					.reduce<Required<model.User.Readable>[]>((users, user) => {
						const permissions = user.permissions[this.referer]
						if (permissions)
							if (!organizationIds)
								users.push(
									model.User.Readable.to(
										{
											...user,
											permissions: { [this.referer]: user.permissions[this.referer] },
										},
										this.referer
									)
								)
							else if (
								user.permissions[this.referer] &&
								organizationIds.some(organizationId => permissions[organizationId])
							)
								users.push(
									model.User.Readable.to(
										{
											...user,
											permissions: {
												[this.referer]: Object.fromEntries(
													Object.entries(permissions).filter(
														([organizationId, _]) => organizationIds.includes(organizationId) || organizationId == "*"
													)
												),
											},
										},
										this.referer
									)
								)
						return users
					}, [])
	}
	async changePassword(
		email: string,
		passwordChange: model.User.Password.Change,
		entityTag: string
	): Promise<gracely.Result | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).put<"">(
			"user/password",
			passwordChange,
			{ ifMatch: [entityTag], contentType: "application/json;charset=UTF-8" }
		)
		return response == "" ? gracely.success.noContent() : response
	}
	async changeName(
		email: string,
		entityTag: string,
		names: model.User.Name
	): Promise<Required<model.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).put<
			model.User | gracely.Error
		>("user/name", names, { ifMatch: [entityTag], contentType: "application/json;charset=UTF-8" })
		return gracely.Error.is(response) ? response : model.User.Readable.to(response, this.referer)
	}
	async updatePermissions(
		organizationId: string,
		email: string,
		permissions: model.User.Permissions.Readable,
		entityTag: string
	): Promise<Required<model.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).patch<
			Required<model.User>
		>(`user/permission/${organizationId}`, permissions, {
			ifMatch: [entityTag],
			contentType: "application/json;charset=UTF-8",
			application: this.referer,
		})
		return gracely.Error.is(response) ? response : model.User.Readable.to(response, this.referer)
	}
	async fetch(email: string): Promise<Required<model.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).get<model.User>(
			`user`
		)
		return gracely.Error.is(response) ? response : model.User.Readable.to(response, this.referer)
	}
	static open(environment: Environment, referer: string | undefined): Users | gracely.Error {
		return !referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !environment.userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: !environment.applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: new this(environment.userNamespace, environment.applicationNamespace, referer)
	}
}
