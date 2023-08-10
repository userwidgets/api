import { cryptly } from "cryptly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { Applications } from "../Applications"
import { Application } from "../Applications/Application"
import type { Context } from "../index"
import { Organization } from "./Organization"

export interface Result {
	value: userwidgets.Organization
	application: userwidgets.Application
}

export class Organizations {
	async get(id: userwidgets.Organization.Identifier) {
		return (await this.context.applications.get())?.organizations[id]
	}
	async set(organization: Omit<Organization, "modified">): Promise<Organization | undefined> {
		const application = await this.context.applications.get()
		return !application
			? undefined
			: (
					await this.context.applications.set({
						...application,
						organizations: {
							...application.organizations,
							[organization.id]: { ...organization, modified: isoly.DateTime.now() },
						},
					})
			  ).organizations[organization.id]
	}
	private constructor(private readonly context: { applications: Applications }) {}
	async id(retries = 5): Promise<userwidgets.Organization.Identifier | undefined> {
		const application = await this.context.applications.get()
		const id = cryptly.Identifier.generate(userwidgets.Organization.Identifier.length)
		return !application || retries <= 0 ? undefined : !(id in application.organizations) ? id : await this.id(--retries)
	}
	async fetch(id: userwidgets.Organization.Identifier): Promise<Result | undefined> {
		const application = await this.context.applications.get()
		return !application || !application.organizations[id]
			? undefined
			: { value: Organization.model(application.organizations[id]), application: Application.model(application) }
	}
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable,
		options?: { current?: Result }
	): Promise<Result | undefined> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const application =
			options?.current?.application ??
			(application => (!application ? undefined : Application.model(application)))(
				await this.context.applications.get()
			)
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
	async create(
		organization: userwidgets.Organization.Creatable & { id?: userwidgets.Organization.Identifier }
	): Promise<Result | undefined> {
		let result: Awaited<ReturnType<Organizations["create"]>>
		const application = await this.context.applications.get()
		if (!application)
			result = undefined
		else {
			const id = organization.id ?? (await this.id())
			if (!id)
				result = undefined
			else {
				const created = await this.set(Organization.from({ ...organization, id }))
				result = !created
					? undefined
					: { value: Organization.model(created), application: Application.model(application) }
			}
		}
		return result
	}
	static create(_: DurableObjectState, context: Context): Organizations {
		return new this(context)
	}
}
