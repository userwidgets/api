export interface Environment extends Record<string, undefined | string | DurableObjectNamespace | KVNamespace> {
	/**
	 * Used to authenticate admin with http-header:
	 * Authorization: `Basic ${adminSecret}`
	 * Set as encrypted value in Cloudflare.
	 */
	adminSecret?: string
	/**
	 * Password pepper. A random string.
	 * Set as encrypted value in Cloudflare.
	 */
	hashSecret?: string
	/**
	 * private RSA key used for signing Keys and Tags (invites)
	 * Must be pair with privateKey.
	 * Set as encrypted value in Cloudflare. (But is exposed in /version)
	 */
	publicKey?: string
	/**
	 * private RSA key used for signing Keys and Tags (invites)
	 * Must be pair with publicKey.
	 * Set as encrypted value in Cloudflare.
	 */
	privateKey?: string
	/** The issuers name in JWT eg: userwidgets */
	issuer?: string
	/** kv binding
	 * partition: invite| is used for jwt shortening
	 */
	userwidgetsStore?: KVNamespace
	/** Binding for users */
	userNamespace?: DurableObjectNamespace
	/** binding for users and organizations */
	applicationNamespace?: DurableObjectNamespace
	// See README.md for email-settings.
	/** The email address users see in the from field in emails. eg: no-reply@example.com */
	email?: string
	/** The email name users see in the from field in emails. eg: no-reply@example.com */
	emailName?: string
	/**
	 * RSA private key for dkim
	 * Set as encrypted value in Cloudflare.
	 */
	dkimPrivateKey?: string
	/** domain emails originate from */
	dkimDomain?: string
	/** dkim selector for mailchannels */
	dkimSelector?: string
	/** Name of the queryparameter for the link with an invite-tag. Default to "invite" */
	inviteParameterName?: string
}
