export interface Environment extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace> {
	adminSecret?: string
	hashSecret?: string
	privateSecret?: string
	issuer?: string
	store?: KVNamespace
	userNamespace?: DurableObjectNamespace
	applicationNamespace?: DurableObjectNamespace
	email?: string
	dkimPrivateKey?: string
	dkimDomain?: string
	dkimSelector?: string
}
