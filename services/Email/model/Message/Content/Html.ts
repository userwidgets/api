import { isly } from "isly"

export interface Html {
	html: string
	attachments?: File[]
}
export namespace Html {
	export const type = isly.object<Html>({
		html: isly.string(),
		attachments: isly.array<File>(isly.fromIs("File", value => value instanceof File)),
	})
	export const is = type.is
}
