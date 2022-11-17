import * as cryptly from "cryptly"
import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import * as common from "../../../common"

export class Application {
	private constructor(
		private readonly applicationNamespace: DurableObjectNamespace,
		private readonly userNamespace: DurableObjectNamespace
	) {}
	async fetch(id: string): Promise<model.Application | gracely.Error> {
		return await common.DurableObject.Client.open(this.applicationNamespace, id).get<model.Application>(`application`)
	}

	async create(application: model.Application.Creatable): Promise<model.Application | gracely.Error> {
		const id = cryptly.Identifier.generate(4)
		const response = await common.DurableObject.Client.open(this.applicationNamespace, id).post<model.Application>(
			`application/${id}`,
			application
		)
		return response
	}

	async seed(application: model.Application): Promise<model.Application | gracely.Error> {
		return await common.DurableObject.Client.open(this.applicationNamespace, application.id).post<model.Application>(
			"application/seed",
			application
		)
	}

	async fetchOrganization(applicationId: string, organizationId: string): Promise<model.Organization | gracely.Error> {
		return await common.DurableObject.Client.open(this.applicationNamespace, applicationId).get<model.Organization>(
			`organization/${organizationId}`
		)
	}

	async createOrganization(
		applicationId: string,
		organization: model.Organization.Creatable
	): Promise<model.Organization | gracely.Error> {
		return common.DurableObject.Client.open(this.applicationNamespace, applicationId).post<model.Organization>(
			"organization",
			organization
		)
	}
	async removeOrganizationUser(
		applicationId: string,
		organizationId: string,
		email: string,
		entityTag: string
	): Promise<{ organization: model.Organization | gracely.Error; user?: gracely.Error }> {
		const [organization, user] = await Promise.all([
			common.DurableObject.Client.open(this.applicationNamespace, applicationId).delete<model.Organization>(
				`organization/${organizationId}/user/${email}`,
				{ ifMatch: [entityTag], contentType: "application/json;charset=UTF-8", application: applicationId }
			),
			common.DurableObject.Client.open(this.userNamespace, email).delete<model.User>(
				`user/permission/${organizationId}`,
				{ ifMatch: [entityTag], contentType: "application/json;charset=UTF-8", application: applicationId }
			),
		])
		return { organization: organization, ...(gracely.Error.is(user) && { user: user }) }
	}

	async listOrganizations(
		applicationId: string,
		organizationIds: string[]
	): Promise<model.Organization[] | gracely.Error> {
		const response = await common.DurableObject.Client.open(this.applicationNamespace, applicationId).get<
			model.Organization[]
		>(`organization`)
		return gracely.Error.is(response)
			? response
			: response.filter(organization => organizationIds.includes(organization.id))
	}
	async updateOrganization(
		applicationId: string,
		organizationId: string,
		users: string[]
	): Promise<string[] | gracely.Error> {
		return await common.DurableObject.Client.open(this.applicationNamespace, applicationId).patch<string[]>(
			`organization/user/${organizationId}`,
			users
		)
	}

	static open(
		applicationNamespace?: DurableObjectNamespace,
		userNamespace?: DurableObjectNamespace
	): Application | gracely.Error {
		return !applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: !userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: new this(applicationNamespace, userNamespace)
	}
}
