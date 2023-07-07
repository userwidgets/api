import * as gracely from "gracely"
import * as model from "@userwidgets/model"
import { common } from "../../common"
import type { Context } from "../index"
import { Inviter } from "../Inviter"
import { Organizations } from "./Organizations"

export class Applications {
	readonly organizations: Organizations
	private constructor(
		private readonly context: {
			applicationNamespace: DurableObjectNamespace
			userNamespace: DurableObjectNamespace
			referer: string
		},
		inviter: Inviter
	) {
		this.organizations = new Organizations({ ...context, inviter })
	}
	private user(email: string): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.userNamespace, email)
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.applicationNamespace, this.context.referer)
	}
	async fetch(): Promise<model.Application | gracely.Error> {
		return await this.application().get<model.Application>(`application`)
	}
	async create(application: model.Application.Creatable): Promise<model.Application | gracely.Error> {
		const response = await this.application().post<model.Application>(
			`application/${this.context.referer}`,
			application
		)
		return response
	}
	// async fetchOrganization(organizationId: string): Promise<model.Organization | gracely.Error> {
	// 	return await this.application().get<model.Organization>(`organization/${organizationId}`)
	// }
	// async createOrganization(organization: model.Organization.Creatable): Promise<model.Organization | gracely.Error> {
	// 	return common.DurableObject.Client.open(
	// 		this.context.applicationNamespace,
	// 		this.context.referer
	// 	).post<model.Organization>("organization", organization)
	// }
	// async removeOrganizationUser(
	// 	organizationId: string,
	// 	email: string,
	// 	entityTag: string
	// ): Promise<{ organization: model.Organization | gracely.Error; user?: gracely.Error }> {
	// 	const [organization, user] = await Promise.all([
	// 		common.DurableObject.Client.open(this.applicationNamespace, this.referer).delete<model.Organization>(
	// 			`organization/${organizationId}/user/${email}`,
	// 			{ ifMatch: [entityTag], contentType: "application/json;charset=UTF-8", application: this.referer }
	// 		),
	// 		common.DurableObject.Client.open(this.userNamespace, email.toLowerCase()).delete<model.User>(
	// 			`user/permission/${organizationId}`,
	// 			{ ifMatch: [entityTag], contentType: "application/json;charset=UTF-8", application: this.referer }
	// 		),
	// 	])
	// 	return { organization: organization, ...(gracely.Error.is(user) && { user: user }) }
	// }
	// async listOrganizations(organizationIds: string[]): Promise<model.Organization[] | gracely.Error> {
	// 	const response = await common.DurableObject.Client.open(this.applicationNamespace, this.referer).get<
	// 		model.Organization[]
	// 	>(`organization`)
	// 	return gracely.Error.is(response)
	// 		? response
	// 		: response.filter(organization => organizationIds.includes(organization.id))
	// }
	// async updateOrganization(organizationId: string, users: string[]): Promise<string[] | gracely.Error> {
	// 	return await common.DurableObject.Client.open(this.applicationNamespace, this.referer).patch<string[]>(
	// 		`organization/user/${organizationId}`,
	// 		users
	// 	)
	// }
	// static open(environment: Environment, referer: string | undefined): Applications | gracely.Error {
	static open(context: Context): Applications | gracely.Error {
		return !context.referer
			? gracely.client.missingHeader("Referer", "Referer required.")
			: !context.environment.applicationNamespace
			? gracely.server.misconfigured("applicationNamespace", "Storage namespace missing.")
			: !context.environment.userNamespace
			? gracely.server.misconfigured("userNamespace", "Storage namespace missing.")
			: gracely.Error.is(context.inviter)
			? context.inviter
			: new this(
					{
						applicationNamespace: context.environment.applicationNamespace,
						userNamespace: context.environment.userNamespace,
						referer: context.referer,
					},
					context.inviter
			  )
	}
}
