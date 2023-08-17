import { userwidgets } from "@userwidgets/model"
import { Organization } from "./Organization"

describe("Organization", () => {
	it("from Creatable", () => {
		const organization: userwidgets.Organization.Creatable = {
			name: "organization name",
			permissions: ["organization", "user"],
			users: [
				{
					email: "jane@example.com",
					permissions: { "*": ["app.view"], organization: ["custom.write"] },
				},
			],
		}
		const id = "a1b2c3d4"
		const result = Organization.from({ ...organization, id })
		console.log(result)
	})
})
