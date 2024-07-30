import { cryptly } from "cryptly"
import { gracely } from "gracely"
import { Resend } from "resend"
import { Context } from "../../Context"
import { Email, register } from "../Email"
import { model } from "./model"

class ResendEmail extends Email {
	private constructor(sender: { email: string; name?: string }, private readonly backend: Resend) {
		super(sender)
	}
	async send(message: Email.model.Message): Promise<gracely.Result> {
		const content = {
			...message.content,
			attachments: !message.content.attachments
				? undefined
				: await Promise.all(
						message.content.attachments?.map(async file => ({
							filename: file.name,
							content_type: file.type,
							content: await file.arrayBuffer().then(buffer => cryptly.Base64.encode(buffer, "standard")),
						}))
				  ),
		}
		const result = await this.backend.emails.send({
			subject: message.subject,
			from: this.from,
			to: message.to,
			cc: message.carbonCopy,
			bcc: message.blindCarbonCopy,
			...(({ attachments, ...content }) => content)(message.content),
			attachments: content.attachments,
		})
		return model.Email.Result.toGracely(result)
	}
	static async create(_: Context, environment: Context.Environment): Promise<Email | gracely.Error> {
		return !environment.resendApiKey
			? gracely.server.misconfigured("resendApiKey", "Missing API key from email service supplier.")
			: !environment.email
			? gracely.server.misconfigured("email", `From email is missing.`)
			: new this({ email: environment.email, name: environment.emailName }, new Resend(environment.resendApiKey))
	}
}

register("resend", async (...args) => ResendEmail.create(...args))
