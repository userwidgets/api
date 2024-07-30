import { isly } from "isly"
import { Content as MessageContent } from "./Content"

export type Message = {
	subject: string
	to: string | string[]
	carbonCopy?: string | string[]
	blindCarbonCopy?: string | string[]
	content: Message.Content
}
export namespace Message {
	export import Content = MessageContent
	export const type = isly.object<Message>({
		subject: isly.string(),
		to: isly.union(isly.string(), isly.array(isly.string())),
		carbonCopy: isly.union(isly.string(), isly.array(isly.string())).optional(),
		blindCarbonCopy: isly.union(isly.string(), isly.array(isly.string())).optional(),
		content: Content.type,
	})
	export const is = type.is
}
