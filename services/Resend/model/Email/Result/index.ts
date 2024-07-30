import { gracely } from "gracely"
import { isly } from "isly"
import { CreateEmailResponse } from "resend"
import { Error as ResultError } from "./Error"
import { Success as ResultSuccess } from "./Success"

export type Result = CreateEmailResponse
export namespace Result {
	export import Success = ResultSuccess
	export import Error = ResultError
	export const type = isly.object<Result>({
		data: isly.union(
			Success.type,
			isly.fromIs<null>("null", value => value === null)
		),
		error: isly.union(
			Error.type,
			isly.fromIs<null>("null", value => value === null)
		),
	})
	export function toGracely(result: Result): gracely.Result {
		return result.error ? gracely.server.backendFailure(result.error) : { status: 200, body: result.data }
	}
}
