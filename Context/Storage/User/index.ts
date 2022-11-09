import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as common from "../../../common"

export class User {
	private constructor(
		private readonly userNamespace: DurableObjectNamespace,
		private readonly applicationNamespace: DurableObjectNamespace
	) {}
	async create(applicationId: string, user: model.User.Creatable): Promise<model.User.Key.Creatable | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, user.email).post<model.User>(
			"user",
			user,
			{
				application: applicationId,
				contentType: "application/json;charset=UTF-8",
			}
		)
		return gracely.Error.is(response)
			? response
			: model.User.toKey(response, applicationId) ?? gracely.client.notFound()
	}
	async patch(tag: model.User.Tag): Promise<model.User.Key.Creatable | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, tag.email).patch<model.User>(
			"user",
			tag
		)
		return gracely.Error.is(response) ? response : model.User.toKey(response, tag.audience) ?? gracely.client.notFound()
	}
	async authenticate(
		credentials: model.User.Credentials,
		applicationId: string
	): Promise<model.User.Key.Creatable | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, credentials.user).post<model.User>(
			"user/authenticate",
			credentials
		)
		return gracely.Error.is(response)
			? response
			: model.User.toKey(response, applicationId) ?? gracely.client.notFound()
	}
	async list(applicationId: string, organizationIds?: string[]): Promise<model.User[] | gracely.Error> {
		const response = await common.DurableObject.Client.open(
			this.applicationNamespace,
			applicationId
		).get<model.Application>("application")
		return gracely.Error.is(response)
			? response
			: (
					(
						await Promise.all(
							Array.from(
								new Set(
									Object.values(response.organizations)
										.map(organization => organization.users)
										.flat()
								),
								async email => await common.DurableObject.Client.open(this.userNamespace, email).get<model.User>("user")
							)
						)
					).filter(response => !gracely.Error.is(response)) as model.User[]
			  ).reduce<model.User[]>((users, user) => {
					const permissions = user.permissions[applicationId]
					if (permissions)
						if (!organizationIds)
							users.push({ ...user, permissions: { applicationId: user.permissions[applicationId] } })
						else if (
							user.permissions[applicationId] &&
							organizationIds.some(organizationId => permissions[organizationId])
						)
							users.push({
								...user,
								permissions: {
									applicationId: Object.fromEntries(
										Object.entries(permissions).filter(
											([organizationId, _]) => organizationIds.includes(organizationId) || organizationId == "*"
										)
									),
								},
							})
					return users
			  }, [])
	}
	async changePassword(
		email: string,
		passwordChange: model.User.Password.Change,
		entityTag: string
	): Promise<gracely.Result | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email).put<"">(
			"user/password",
			passwordChange,
			{ ifMatch: [entityTag] }
		)
		return response == "" ? gracely.success.noContent() : response
	}
	async changeName(email: string, entityTag: string, names: model.User.Name): Promise<model.User | gracely.Error> {
		return await common.DurableObject.Client.open(this.userNamespace, email).put<model.User | gracely.Error>(
			"/user/name",
			names,
			{ ifMatch: [entityTag] }
		)
	}
	async seed(user: model.User): Promise<model.User | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, user.email).post<model.User>(
			"user/seed",
			user
		)
		return response
	}
	async fetch(email: string): Promise<model.User | gracely.Error> {
		return await common.DurableObject.Client.open(this.userNamespace, email).get<model.User>(`user`)
	}
	static open(
		userNamespace?: DurableObjectNamespace,
		applicationNamespace?: DurableObjectNamespace
	): User | gracely.Error {
		return !userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: !applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: applicationNamespace && new this(userNamespace, applicationNamespace)
	}
}
