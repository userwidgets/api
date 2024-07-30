import { isly } from "isly"
import { BlindCarbonCopy as RecipientBlindCarbonCopy } from "./BlindCarbonCopy"
import { CarbonCopy as RecipientCarbonCopy } from "./CarbonCopy"
import { Original as RecipientOriginal } from "./Original"

export type Recipients = RecipientOriginal | RecipientCarbonCopy | RecipientBlindCarbonCopy
export namespace Recipients {
	export import Original = RecipientOriginal
	export import CarbonCopy = RecipientCarbonCopy
	export import BlindCarbonCopy = RecipientBlindCarbonCopy
	export const type = isly.union(Original.type, CarbonCopy.type, BlindCarbonCopy.type)
	export const is = type.is
	export function stringify(recipients: Recipients): string {
		return typeof recipients.emails == "string" ? recipients.emails : recipients.emails.join(", ")
	}
}
