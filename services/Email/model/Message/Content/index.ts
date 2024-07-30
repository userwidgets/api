import { isly } from "isly"
import { Html as ContentHtml } from "./Html"
import { Text as ContentText } from "./Text"

export type Content = Content.Text | Content.Html
export namespace Content {
	export import Html = ContentHtml
	export import Text = ContentText
	export const type = isly.union(Text.type, Html.type)
	export const is = type.is
}
