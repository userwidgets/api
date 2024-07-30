import { isly } from "isly"

export interface Original {
	emails: string | string[]
}
export namespace Original {
	export const type = isly.object<Original>({
		emails: isly.union(isly.string(), isly.array(isly.string())),
	})
	export const is = type.is
}
