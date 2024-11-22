import { gracely } from "gracely"
import { userwidgets } from "@userwidgets/model"
import { common } from "../../common"
import { filters } from "../filters"
import type { Context } from "../index"
import { Inviter } from "../Inviter"
import { Organizations } from "./Organizations"

export class Applications {
	readonly organizations: Organizations
	private constructor(
		private readonly context: {
			userNamespace: DurableObjectNamespace
			referer: string
			inviter: Inviter
			services: Context["services"]
		},
		private readonly environment: {
			applicationNamespace: DurableObjectNamespace
			inviteParameterName: string | undefined
		}
	) {
		this.organizations = new Organizations({ ...context, applications: this }, this.environment)
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.environment.applicationNamespace, this.context.referer)
	}
	async fetch(permissions?: userwidgets.User.Permissions): Promise<userwidgets.Application | gracely.Error> {
		const result = await this.application().get<userwidgets.Application>(`application`)
		return gracely.Error.is(result) || permissions == undefined
			? result
			: filters.application(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async create(
		application: userwidgets.Application.Creatable,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.Application | gracely.Error> {
		const result = await this.application().post<userwidgets.Application>(
			`application/${this.context.referer}`,
			application
		)
		return gracely.Error.is(result) || permissions == undefined
			? result
			: filters.application(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
	async update(
		application: userwidgets.Application.Changeable,
		permissions?: userwidgets.User.Permissions
	): Promise<userwidgets.Application | gracely.Error> {
		// TODO implement
		const result = await this.application().patch<userwidgets.Application>(`application`, application, {
			contentType: "application/json",
		})
		return permissions == undefined || gracely.Error.is(result)
			? result
			: filters.application(permissions, result) ?? gracely.client.unauthorized("forbidden")
	}
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
						userNamespace: context.environment.userNamespace,
						referer: context.referer,
						inviter: context.inviter,
						services: context.services,
					},
					{
						applicationNamespace: context.environment.applicationNamespace,
						inviteParameterName: context.environment.inviteParameterName,
					}
			  )
	}
}
