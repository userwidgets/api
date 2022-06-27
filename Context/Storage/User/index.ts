import * as gracely from "gracely"
import * as model from "../../../../model"
import * as common from "../../../common"

export class User {
	private constructor(
		private readonly userNamespace: DurableObjectNamespace,
		private readonly applicationNamespace: DurableObjectNamespace
	) {}
	async create(credentials: model.User.Credentials): Promise<model.User | gracely.Error> {
		return await common.DurableObject.Client.open(this.userNamespace, credentials.user).post<model.User>(
			"user",
			credentials
		)
	}
	async authenticate(credentials: model.User.Credentials): Promise<model.User | gracely.Error> {
		const response: model.User | gracely.Error = await common.DurableObject.Client.open(
			this.userNamespace,
			credentials.user
		).post<model.User>("user/authenticate", credentials)
		return response
	}
	async list(application: string, organizations: string[]): Promise<model.User[] | gracely.Error> {
		const response = await common.DurableObject.Client.open(
			this.applicationNamespace,
			application
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
			  ).map(user => ({
					...user,
					permissions: {
						[application]: Object.fromEntries(
							Object.entries(user.permissions[application]).filter(([orgId, _]) => organizations.includes(orgId))
						),
					},
			  }))
	}

	async changePassword(
		email: string,
		passwordChange: model.User.PasswordChange
	): Promise<gracely.Result | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.userNamespace, email).put<"">(
			"user/password",
			passwordChange
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
		return await common.DurableObject.Client.open(this.userNamespace, user.email).post<model.User>("user/seed", user)
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
