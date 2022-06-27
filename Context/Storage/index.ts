import * as gracely from "gracely"
import { Environment } from "../../Context/Environment"
import { Application } from "./Application"
import { User } from "./User"

export class Storage {
	#user?: User | gracely.Error
	#application?: Application | gracely.Error
	get user(): User | gracely.Error {
		return this.#user ?? (this.#user = User.open(this.environment.userNamespace, this.environment.applicationNamespace))
	}
	get application(): Application | gracely.Error {
		return this.#application ?? (this.#application = Application.open(this.environment.applicationNamespace))
	}
	constructor(private environment: Environment) {}
}
