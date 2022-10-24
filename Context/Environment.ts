export interface Environment extends Record<string, undefined | string | DurableObjectNamespace> {
	adminSecret?: string
	hashSecret?: string
	privateSecret?: string
	issuer?: string
	userNamespace?: DurableObjectNamespace
	applicationNamespace?: DurableObjectNamespace
	email?: string
	dkimPrivateKey?: string
	dkimDomain?: string
	dkimSelector?: string
}
