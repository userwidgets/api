# Userwidgets
## Environment
	See docs in `Context/Environment.ts`
## Generate private RSA:
Use [utily/cryptly](https://github.com/utily/cryptly)
`await (Signer.generate("RSA", "SHA-256", 4096)).export("private", "base64")` ([Demonstrated here](https://github.com/utily/cryptly/blob/master/Signer/Rsa.spec.ts#L22-L42) )

## Create KV
Run `wrangler kv:namespace create store` and update `wrangler.toml` with information from the result.

## Email
### Sending emails on cloudflare workers with Resend
Specify the environment variables (expected values documented in `./Context/Environment.ts`):
* `email`
* `emailName`
* `emailService` 
* `resendApiKey`
And follow this guide:
* https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/
### Read more about email DMARC
* https://en.wikipedia.org/wiki/DMARC
* https://sv.wikipedia.org/wiki/DomainKeys_Identified_Mail
* https://en.wikipedia.org/wiki/Sender_Policy_Framework

## Initialize first user
1. `POST /application`
2. `POST /organization`
3. `PATCH /organization?url=[frontend]`
   * url is optional. if present userwidgets should send email in prod and console.log locally
   * In this request the users are specified
4. `POST /me`

## example requests
* https://www.postman.com/bold-space-115614/workspace/userwidgets/
