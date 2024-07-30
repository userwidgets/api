import { gracely } from "gracely"
import { Context } from "../../Context"
import { model as EmailModel } from "./model"

export abstract class Email {
	protected get from(): string {
		return !this.sender.name ? this.sender.email : `${this.sender.name} <${this.sender.email}>`
	}
	protected constructor(private readonly sender: { email: string; name?: string }) {}
	abstract send(message: Email.model.Message): Promise<gracely.Result>
	static async load(context: Context, environment: Context.Environment): Promise<Email | gracely.Error> {
		return !environment.emailService
			? gracely.server.misconfigured("emailService", "Email service is not specified.")
			: implementations[environment.emailService]?.(context, environment) ??
					gracely.server.misconfigured("service", `Email service provider ${environment.emailService} is not defined.`)
	}
}
export namespace Email {
	export import model = EmailModel
}
type Implementation = (context: Context, environment: Context.Environment) => Promise<Email | gracely.Error>
const implementations: Record<string, Implementation | undefined> = {}
export function register(service: string, implementation: Implementation): void {
	implementations[service] = implementation
}
