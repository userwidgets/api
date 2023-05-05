export interface Environment extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace> {
	/**
	 * Used to authenticate admin with http-header:
	 * Authorization: `Basic ${adminSecret}`
	 * Set as encrypted value in Cloudflare.
	 */
	adminSecret?: string
	/**
	 * Password pepper
	 * Set as encrypted value in Cloudflare.
	 */
	hashSecret?: string
	/**
	 * private RSA key used for signing Keys and Tags (invites)
	 * Set as encrypted value in Cloudflare.
	 */
	privateSecret?: string
	/** The issuers name in JWT eg: userwidgets */
	issuer?: string
	/** kv binding (Not used...) */
	store?: KVNamespace
	/** Binding for users */
	userNamespace?: DurableObjectNamespace
	/** binding for users and organizations */
	applicationNamespace?: DurableObjectNamespace
	// See README.md for email-settings.
	/** The email adress users see in the from field in emails. eg: no-reply@example.com */
	email?: string
	/**
	 * RSA private key for dkim
	 * Set as encrypted value in Cloudflare.
	 */
	dkimPrivateKey?: string
	/** domain emails originate from */
	dkimDomain?: string
	/** dkim selector for mailchannels */
	dkimSelector?: string
}
