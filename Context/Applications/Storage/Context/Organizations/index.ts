import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { Applications } from "../Applications"
import { Application } from "../Applications/Application"
import type { Context } from "../index"
import { Organization } from "./Organization"

export interface Result {
	value: Organization
	application: Application
}

export class Organizations {
	private constructor(private readonly context: { applications: Applications }) {}
	async fetch(id: userwidgets.Organization.Identifier): Promise<Result | undefined> {
		const application = await this.context.applications.fetch()
		return !application || !application.organizations[id]
			? undefined
			: { value: application.organizations[id], application }
	}
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable,
		options?: { current?: Result }
	): Promise<Result | undefined> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const application = options?.current?.application ?? (await this.context.applications.fetch())
		if (!application)
			result = undefined
		else {
			result = {
				value: (application.organizations[id] = {
					...application.organizations[id],
					...organization,
					modified: isoly.DateTime.now(),
				}),
				application,
			}
			await this.context.applications.change(application)
		}
		return result
	}
	static create(_: DurableObjectState, context: Context): Organizations {
		return new this(context)
	}
}
