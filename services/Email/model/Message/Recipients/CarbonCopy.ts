import { isly } from "isly"
import { Original } from "./Original"

export interface CarbonCopy extends Original {
	cc: boolean
}
export namespace CarbonCopy {
	export const type = Original.type.extend<CarbonCopy>({
		cc: isly.boolean(),
	})
	export const is = type.is
}
