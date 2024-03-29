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
			applicationNamespace: DurableObjectNamespace
			userNamespace: DurableObjectNamespace
			referer: string
		},
		inviter: Inviter
	) {
		this.organizations = new Organizations({ ...context, inviter, applications: this })
	}
	private application(): common.DurableObject.Client {
		return common.DurableObject.Client.open(this.context.applicationNamespace, this.context.referer)
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
