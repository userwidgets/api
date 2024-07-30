import { isly } from "isly"
import { Original } from "./Original"

export interface BlindCarbonCopy extends Original {
	bcc: boolean
}
export namespace BlindCarbonCopy {
	export const type = Original.type.extend<BlindCarbonCopy>({
		bcc: isly.boolean(),
	})
	export const is = type.is
}
