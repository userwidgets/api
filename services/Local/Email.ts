import { gracely } from "gracely"
import { Context } from "../../Context"
import { Email, register } from "../Email"

export class LocalEmail extends Email {
	async send(message: Email.model.Message): Promise<gracely.Result> {
		const result: gracely.Result = { status: 200 }
		const subject = message.subject
		const recipients =
			"To: " +
			(!Array.isArray(message.to) ? message.to : message.to.join(", ")) +
			(!message.carbonCopy
				? ""
				: "\nCC: " + (!Array.isArray(message.carbonCopy) ? message.carbonCopy : message.carbonCopy.join(", "))) +
			(!message.blindCarbonCopy
				? ""
				: "\nBCC: " +
				  (!Array.isArray(message.blindCarbonCopy) ? message.blindCarbonCopy : message.blindCarbonCopy.join(", ")))
		const content = typeof message.content == "string" ? message.content : JSON.stringify(message.content)
		console.log(`Subject: ${subject}\nFrom: ${this.from}\n${recipients}\n${content}\n\n`)
		return result
	}
	static async create(_: Context, environment: Context.Environment): Promise<Email | gracely.Error> {
		return !environment.email
			? gracely.server.misconfigured("email", `From email is missing.`)
			: new this({ email: environment.email })
	}
}
register("local", (...args) => LocalEmail.create(...args))
