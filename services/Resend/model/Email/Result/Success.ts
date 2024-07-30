import { isly } from "isly"
import { CreateEmailResponseSuccess } from "resend"

export type Success = CreateEmailResponseSuccess
export namespace Success {
	export const type = isly.object<Success>({
		id: isly.string(),
	})
	export const is = type.is
}
