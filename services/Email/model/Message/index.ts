import { isly } from "isly"
import { Content as MessageContent } from "./Content"
import { Recipients as MessageRecipients } from "./Recipients"

export type Message = {
	subject: string
	recipients: Message.Recipients
	content: Message.Content
}
export namespace Message {
	export import Recipients = MessageRecipients
	export import Content = MessageContent
	export const is = isly.object<Message>({
		subject: isly.string(),
		recipients: Recipients.type,
		content: Content.type,
	})
}
