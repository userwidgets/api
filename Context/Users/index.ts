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
	async create(user: userwidgets.User.Creatable): Promise<userwidgets.User | gracely.Error> {
		return this.user(user.email).post<userwidgets.User>("user", user, {
			application: this.context.referer,
			contentType: "application/json;charset=UTF-8",
		})
	}
	// async create(user: userwidgets.User.Creatable): Promise<userwidgets.User.Key.Creatable | gracely.Error> {
	// 	const created = await common.DurableObject.Client.open(
	// 		this.userNamespace,
	// 		user.email.toLowerCase()
	// 	).post<userwidgets.User>("user", user, { application: this.referer, contentType: "application/json;charset=UTF-8" })
	// 	let result: userwidgets.User.Key.Creatable | gracely.Error = gracely.Error.is(created)
	// 		? created
	// 		: userwidgets.User.toKey(created, this.referer) ?? gracely.client.notFound()
	// 	if (!gracely.Error.is(result) && result.permissions["*"]?.application?.read) {
	// 		const application = await common.DurableObject.Client.open(
	// 			this.applicationNamespace,
	// 			this.referer
	// 		).get<userwidgets.Application>("application")
	// 		gracely.Error.is(application)
	// 			? (result = application)
	// 			: (result.permissions = {
	// 					...Object.fromEntries(Object.keys(application.organizations).map(id => [id, {}])),
	// 					...result.permissions,
	// 			  })
	// 	}
	// 	return result
	// }
	async join(invite: userwidgets.User.Invite): Promise<userwidgets.User | gracely.Error> {
		return await this.user(invite.email).patch(`user`, invite)
	}
	async update(email: userwidgets.Email, user: userwidgets.User.Changeable): Promise<userwidgets.User | gracely.Error> {
		return await this.user(email).patch<userwidgets.User>(`user`, user)
	}

	async authenticate(
		credentials: userwidgets.User.Credentials
	): Promise<userwidgets.User.Key.Creatable | gracely.Error> {
		const user = await common.DurableObject.Client.open(
			this.userNamespace,
			credentials.user.toLowerCase()
		).post<userwidgets.User>("user/authenticate", credentials)
		let result: userwidgets.User.Key.Creatable | gracely.Error = gracely.Error.is(user)
			? user
			: userwidgets.User.toKey(user, this.referer) ?? gracely.client.notFound()
		if (!gracely.Error.is(result) && result.permissions["*"]?.application?.read) {
			const application = await common.DurableObject.Client.open(
				this.applicationNamespace,
				this.referer
			).get<userwidgets.Application>("application")
			gracely.Error.is(application)
				? (result = application)
				: (result.permissions = {
						...Object.fromEntries(Object.keys(application.organizations).map(id => [id, {}])),
						...result.permissions,
				  })
		}
		return result
	}
	async list(organizationIds: string[] | undefined): Promise<Required<userwidgets.User.Readable[]> | gracely.Error> {
		const response = await common.DurableObject.Client.open(
			this.applicationNamespace,
			this.referer
		).get<userwidgets.Application>("application")
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
								await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).get<userwidgets.User>(
									"user"
								)
						)
					)
			  )
					.filter((response): response is userwidgets.User => userwidgets.User.is(response))
					.reduce<Required<userwidgets.User.Readable>[]>((users, user) => {
						const permissions = user.permissions[this.referer]
						if (permissions)
							if (!organizationIds)
								users.push(
									userwidgets.User.Readable.to(
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
									userwidgets.User.Readable.to(
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
		passwordChange: userwidgets.User.Password.Change,
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
		names: userwidgets.User.Name
	): Promise<Required<userwidgets.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).put<
			userwidgets.User | gracely.Error
		>("user/name", names, { ifMatch: [entityTag], contentType: "application/json;charset=UTF-8" })
		return gracely.Error.is(response) ? response : userwidgets.User.Readable.to(response, this.referer)
	}
	async updatePermissions(
		organizationId: string,
		email: string,
		permissions: userwidgets.User.Permissions.Readable,
		entityTag: string
	): Promise<Required<userwidgets.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).patch<
			Required<userwidgets.User>
		>(`user/permission/${organizationId}`, permissions, {
			ifMatch: [entityTag],
			contentType: "application/json;charset=UTF-8",
			application: this.referer,
		})
		return gracely.Error.is(response) ? response : userwidgets.User.Readable.to(response, this.referer)
	}
	async fetch(email: string): Promise<Required<userwidgets.User.Readable> | gracely.Error> {
		const response = await common.DurableObject.Client.open(
			this.userNamespace,
			email.toLowerCase()
		).get<userwidgets.User>(`user`)
		return gracely.Error.is(response) ? response : userwidgets.User.Readable.to(response, this.referer)
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
