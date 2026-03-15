import Adw from "gi://Adw?version=1"
import Gtk from "gi://Gtk?version=4.0"

import { GClass, Property, Child, from } from "../gobjectify/gobjectify.js"
import { Package } from "../dnf.js"

@GClass({ template: "resource:///io/github/flattool/Brim/details_page/details_page.ui" })
export class DetailsPage extends from(Adw.NavigationPage, {
	visible_page_name: Property.string({
		default: "none-selected",
	}).as<"none-selected" | "many-selected" | "single-selected">(),
	package_name: Property.string(),
	_stack: Child<Gtk.Stack>(),
}) {
	selection_changed(first_package: Package | null, total: number): void {
		if (total < 1) {
			this.visible_page_name = "none-selected"
		} else if (total > 1) {
			this.visible_page_name = "many-selected"
		} else {
			this.visible_page_name = "single-selected"
			this.package_name = first_package!.name
		}
	}
}

// #current_process: LineProcess | null = null
// protected _on_pkg_changed(): void {
// 	this.summary = ""
// 	this.#update_summary()
// }
// async #update_summary(): Promise<void> {
// 	this.#current_process?.cancel()
// 	this.#current_process = null
// 	if (!this.pkg) return
// 	this.#current_process = new LineProcess([
// 		"dnf5",
// 		"repoquery",
// 		this.pkg.full_nevra,
// 		"--queryformat",
// 		"%{summary}\n",
// 	], true)
// 	const { stdout, stderr, exit_status, cancelled } = await this.#current_process.run()
// 	if (cancelled) return
// 	if (exit_status !== 0) {
// 		print(`Failed to query package summary for ${this.pkg.full_nevra}!`)
// 		print(stderr.join("\n"))
// 		this.summary = _("Failed to load summary")
// 		return
// 	}
// 	this.summary = stdout.join("\n").trim()
// }
