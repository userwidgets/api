# Userwidgets
## Environment
	See docs in `Context/Environment.ts`
## Generate private RSA:
Use [utily/cryptly](https://github.com/utily/cryptly)
`await (Signer.generate("RSA", "SHA-256", 4096)).export("private", "base64")` ([Demonstrated here](https://github.com/utily/cryptly/blob/master/Signer/Rsa.spec.ts#L22-L42) )

## Email
The application works without email-settings.
(But emailed links are hard to find...)

Read more about setting emailfor cloudflare workers:
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
