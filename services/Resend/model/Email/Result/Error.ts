import { isly } from "isly"
import { ErrorResponse } from "resend"

export type Error = ErrorResponse
export namespace Error {
	export const type = isly.object<Error>({
		message: isly.string(),
		name: isly.string(),
	})
	export const is = type.is
}
