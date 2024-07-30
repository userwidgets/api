import { isly } from "isly"

export interface Text {
	text: string
	attachments?: File[]
}
export namespace Text {
	export const type = isly.object<Text>({
		text: isly.string(),
		attachments: isly.array(isly.fromIs("File", value => value instanceof File)),
	})
	export const is = type.is
}
