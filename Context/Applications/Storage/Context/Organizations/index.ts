import { cryptly } from "cryptly"
import { isoly } from "isoly"
import { userwidgets } from "@userwidgets/model"
import { Applications } from "../Applications"
import type { Context } from "../index"
import { Organization } from "./Organization"

export class Organizations {
	async get(id: userwidgets.Organization.Identifier): Promise<Organization | undefined> {
		return (await this.context.applications.get())?.organizations[id]
	}
	private async set(organization: Omit<Organization, "modified">): Promise<Organization | undefined> {
		const application = await this.context.applications.get()
		return !application
			? undefined
			: (
					await this.context.applications.set({
						...application,
						organizations: {
							...application.organizations,
							[organization.id]: {
								...organization,
								modified: isoly.DateTime.now(),
							},
						},
					})
			  ).organizations[organization.id]
	}
	private constructor(private readonly context: { applications: Applications }) {}
	async id(
		id = cryptly.Identifier.generate(userwidgets.Organization.Identifier.length),
		retries = 5
	): Promise<userwidgets.Organization.Identifier | undefined> {
		return (await this.context.applications.get())?.organizations[id] && retries > 0
			? await this.id(undefined, --retries)
			: id
	}

	async fetch(id: userwidgets.Organization.Identifier): Promise<userwidgets.Organization | undefined> {
		const application = await this.context.applications.get()
		return !application || !application.organizations[id]
			? undefined
			: Organization.model(application.organizations[id])
	}
	async list(): Promise<userwidgets.Organization[] | undefined> {
		let result: Awaited<ReturnType<Organizations["list"]>>
		const application = await this.context.applications.get()
		if (!application)
			result = undefined
		else {
			result = (await Promise.all(Object.keys(application.organizations).map(id => this.fetch(id)))).reduce<
				userwidgets.Organization[]
			>((result, response) => result.concat(response ?? []), [])
		}
		return result
	}
	async update(
		id: userwidgets.Organization.Identifier,
		organization: userwidgets.Organization.Changeable
	): Promise<userwidgets.Organization | undefined> {
		let result: Awaited<ReturnType<Organizations["update"]>>
		const application = await this.context.applications.fetch()
		if (!application)
			result = undefined
		else {
			const updated = await this.set(
				Organization.from({
					...application.organizations[id],
					...(({ users, ...organization }) => organization)(organization),
					...(organization.users && {
						users: organization.users.map(user => (typeof user == "object" ? user.user : user)),
					}),
				})
			)
			result = !updated ? undefined : Organization.model(updated)
		}
		return result
	}
	async create(
		organization: userwidgets.Organization.Creatable & Required<Pick<userwidgets.Organization.Creatable, "id">>
	): Promise<userwidgets.Organization | undefined> {
		let result: Awaited<ReturnType<Organizations["create"]>>
		const application = await this.context.applications.get()
		if (!application)
			result = undefined
		else {
			const created = await this.set(Organization.from(organization))
			result = !created ? undefined : Organization.model(created)
		}
		return result
	}
	static create(_: DurableObjectState, context: Context): Organizations {
		return new this(context)
	}
}
