# Userwidgets
## Environment
* adminSecret: admin password
* hashSecret: password pepper
* privateSecret: private RSA key used for signing Keys and Tags (invites)
* issuer: the issuers name eg: userwidgets
* store: kv binding
* userNamespace: durable object binding for users
* applicationNamespace: durable object binding for users and organizations
* email: the email users see in the from field in emails
* dkimPrivateKey: RSA private key for dkim
* dkim domain: domain emails originate from
* dkimSelector: dkim selector for mailchannels

read more about setting emailfor cloudflare workers:
* https://blog.cloudflare.com/sending-email-from-workers-with-mailchannels/
* https://api.mailchannels.net/tx/v1/documentation
* https://en.wikipedia.org/wiki/DMARC
* https://sv.wikipedia.org/wiki/DomainKeys_Identified_Mail
* https://en.wikipedia.org/wiki/Sender_Policy_Framework

## Initialize first user
* `Post /application`
* `Post /organization`
* `Post /me`
	* Some data from previous requests are required to send this one.

## example requests
* https://www.postman.com/bold-space-115614/workspace/userwidgets/
