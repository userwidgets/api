import * as model from "@userwidgets/model"
import * as http from "cloudly-http"
import { Context } from "../../Context"
import { router } from "../../router"

export async function change(request: http.Request, context: Context): Promise<http.Response.Like | any> {
	let result: 
}

router.add("PUT", "/user/permission", change)
