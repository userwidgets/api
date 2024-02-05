import * as cloudRouter from "cloudly-router"
import { Context } from "./Context"

export const router = new cloudRouter.Router<Context>()
router.allowedHeaders.push("Application", "If-Match", "Authorization-2fa")
