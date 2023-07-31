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
