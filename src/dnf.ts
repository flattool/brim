import Gtk from "gi://Gtk?version=4.0"
import Gio from "gi://Gio?version=2.0"
import GObject from "gi://GObject?version=2.0"

import { GClass, Property, dedent, from, next_idle } from "./gobjectify/gobjectify.js"
import { LineProcess } from "./cli.js"
import { string_format_spec } from "./utils/helper_funcs.js"
import type { ListStore } from "./list_store.js"

// type RepoJson = {
// 	id: string,
// 	name: string,
// 	is_enabled: boolean,
// }

// const is_repo_json = (item: any): item is RepoJson => (
// 	item instanceof Object
// 	&& typeof item.id === "string"
// 	&& typeof item.name === "string"
// 	&& typeof item.is_enabled === "boolean"
// )

// @GClass()
// export class Repo extends from(GObject.Object, {
// 	id: Property.string({ flags: "CONSTRUCT_ONLY" }),
// 	name: Property.string({ flags: "CONSTRUCT_ONLY" }),
// 	is_enabled: Property.bool({ flags: "CONSTRUCT_ONLY" }),
// }) {
// 	static async load_repos(model: Gio.ListStore<Repo>): Promise<void> {
// 		model.remove_all()
// 		// this.id_to_repo.clear()
// 		const response: string = await run_command_async(
// 			["dnf5", "repo", "list", "--all", "--json"],
// 			{ run_on_host: true },
// 		)
// 		const data: any[] = JSON.parse(response)
// 		for (const repo_json of data) {
// 			if (!is_repo_json(repo_json)) continue
// 			const repo = new Repo({
// 				id: repo_json.id,
// 				name: repo_json.name,
// 				is_enabled: repo_json.is_enabled,
// 			})
// 			model.append(repo)
// 			// this.id_to_repo.set(repo_json.id, repo)
// 		}
// 	}

// 	// static id_to_repo = new Map<string, Repo>()
// }

const package_spec = string_format_spec(
	"full_nevra",
	"name",
	"version",
	"arch",
	"repo_id",
)

const INSTALLED_PACKAGE_QUERY = [
	"dnf5",
	"repoquery",
	"--installed",
	"--latest-limit=1",
	"--queryformat",
	package_spec.format,
	// when a package is installed, its "repoid" is "@System"
]

const AVAILABLE_PACKAGE_QUERY = [
	"dnf5",
	"repoquery",
	"--available",
	"--latest-limit=1",
	"--queryformat",
	package_spec.format,
	// when a package is installed, its "repoid" is "@System"
]

@GClass()
export class Package extends from(GObject.Object, {
	full_nevra: Property.string({ flags: "CONSTRUCT_ONLY" }),
	name: Property.string({ flags: "CONSTRUCT_ONLY" }),
	version: Property.string({ flags: "CONSTRUCT_ONLY" }),
	arch: Property.string({ flags: "CONSTRUCT_ONLY" }),
	repo_id: Property.string({ flags: "CONSTRUCT_ONLY" }),
	upgradable_to: Property.string(),
	installed: Property.bool(),
}) {
	static async load_packages(
		model: ListStore<Package>,
		for_each?: (pkg: Package)=> void,
	): Promise<void> {
		const installed_pkgs = new Map<string, Package>()
		const available_pkgs: Package[] = []

		const on_line = (installed: boolean, line: string): void => {
			const package_json = package_spec.parse_and_validate(line)
			if (!package_json) {
				print(`Failed to parse package info: ${line}`)
				return
			}
			if (installed) {
				const pkg = new Package({ ...package_json, installed })
				installed_pkgs.set(package_json.full_nevra, pkg)
				for_each?.(pkg)
			} else if (installed_pkgs.has(package_json.full_nevra)) {
				installed_pkgs.get(package_json.full_nevra)!.upgradable_to = package_json.version
			} else {
				const pkg = new Package({ ...package_json, installed })
				available_pkgs.push(pkg)
				for_each?.(pkg)
			}
		}

		const do_process = async (command: string[], installed: boolean): Promise<void> => {
			const process = new LineProcess(command, true)
			process.on_stdout_line = on_line.bind(null, installed)
			const { exit_status, stderr } = await process.run()
			if (exit_status !== 0) {
				print(`Failed to query ${installed ? "installed" : "available"} packages!`)
				print(stderr.join("\n"))
			}
		}

		await do_process(INSTALLED_PACKAGE_QUERY, true)
		model.swap_contents([...installed_pkgs.values()])

		await do_process(AVAILABLE_PACKAGE_QUERY, false)
		model.swap_contents([...installed_pkgs.values(), ...available_pkgs])
	}
}
