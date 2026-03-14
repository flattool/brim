import Adw from "gi://Adw?version=1"

import { GClass, Property, from, Debounce } from "../gobjectify/gobjectify.js"
import { Package } from "../dnf.js"
import { LineProcess } from "../cli.js"

@GClass({ template: "resource:///io/github/flattool/Brim/details_page/details_page.ui" })
export class DetailsPage extends from(Adw.NavigationPage, {
	pkg: Property.gobject(Package),
	summary: Property.string(),
}) {
	#current_process: LineProcess | null = null

	protected _on_pkg_changed(): void {
		this.summary = ""
		this.#update_summary()
	}

	async #update_summary(): Promise<void> {
		this.#current_process?.cancel()
		this.#current_process = null
		if (!this.pkg) return
		this.#current_process = new LineProcess([
			"dnf5",
			"repoquery",
			this.pkg.full_nevra,
			"--queryformat",
			"%{summary}\n",
		], true)
		const { stdout, stderr, exit_status, cancelled } = await this.#current_process.run()
		if (cancelled) return
		if (exit_status !== 0) {
			print(`Failed to query package summary for ${this.pkg.full_nevra}!`)
			print(stderr.join("\n"))
			this.summary = _("Failed to load summary")
			return
		}
		this.summary = stdout.join("\n").trim()
	}
}
