import { gracely } from "gracely"
import { Context } from "../../Context"
import { Email, register } from "../Email"

export class LocalEmail extends Email {
	async send(message: Email.model.Message): Promise<gracely.Result> {
		const result: gracely.Result = { status: 200 }
		const subject = message.subject
		const recipients = Email.model.Message.Recipients.stringify(message.recipients)
		const content = typeof message.content == "string" ? message.content : JSON.stringify(message)
		console.log(`Subject: ${subject}\nFrom: ${this.from}\nTo: ${recipients}\n${content}\n\n`)
		return result
	}
	static async create(_: Context, environment: Context.Environment): Promise<Email | gracely.Error> {
		return !environment.email
			? gracely.server.misconfigured("email", `From email is missing.`)
			: new this({ email: environment.email })
	}
}
register("local", (...args) => LocalEmail.create(...args))
