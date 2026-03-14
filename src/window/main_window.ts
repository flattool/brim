import Gio from "gi://Gio?version=2.0"
import Gtk from "gi://Gtk?version=4.0"
import Adw from "gi://Adw?version=1"
import Pango from "gi://Pango?version=1.0"

import { GClass, Property, Child, from, Debounce } from "../gobjectify/gobjectify.js"
import { SharedVars } from "../utils/shared_vars.js"
import { Package } from "../dnf.js"
import { ListStore } from "../list_store.js"
import { chunked_idler } from "../utils/helper_funcs.js"

import "../details_pane/details_pane.js"

@GClass({ template: "resource:///io/github/flattool/Brim/window/main_window.ui" })
export class MainWindow extends from(Adw.ApplicationWindow, {
	search_text: Property.string(),
	is_loading: Property.bool({ default: true }),
	_packages: Child<ListStore<Package>>(),
	_selected_packages: Child<ListStore<Package>>(),
	_column_view: Child<Gtk.ColumnView>(),
	_selection_model: Child<Gtk.MultiSelection>(),
	_name_column: Child<Gtk.ColumnViewColumn>(),
	_installed_column: Child<Gtk.ColumnViewColumn>(),
	_toast_overlay: Child<Adw.ToastOverlay>(),
}) {
	readonly #settings = new Gio.Settings({ schema_id: pkg.app_id })

	async _ready(): Promise<void> {
		if (pkg.profile === "development") this.add_css_class("devel")
		print(`Welcome to ${pkg.app_id}!`)

		this.connect("close-request", () => this._column_view.set_model(null))
		this._selected_packages.connect("items-changed", () => print(this._selected_packages.length))

		this._column_view.sort_by_column(this._installed_column, Gtk.SortType.ASCENDING)
		await Package.load_packages(this._packages)
		this.is_loading = false
	}

	add_toast(title: string, params?: { button_label: string, on_clicked: ()=> void }): void {
		const toast = new Adw.Toast({ title })
		if (params) {
			toast.button_label = params.button_label
			toast.connect("button-clicked", params.on_clicked)
		}
		this._toast_overlay.add_toast(toast)
	}

	add_error_toast(title: string, message: string): void {
		const label = new Gtk.Label({ selectable: true, wrap: true, wrap_mode: Pango.WrapMode.WORD_CHAR })
		label.set_markup(`<tt>${message.markup_escape_text()}</tt>`)
		const error_dialog = new Adw.AlertDialog({
			heading: title,
			extra_child: label,
		})
		error_dialog.add_response("copy", _("Copy"))
		error_dialog.add_response("ok", _("OK"))
		error_dialog.connect("response", (__, response) => {
			if (response !== "copy") return
			SharedVars.clipboard.set(message)
		})
		this.add_toast(title, { button_label: _("Details"), on_clicked: () => error_dialog.present(this) })
		print("==== Error Toast ====")
		print(title)
		print(message)
		print("=====================")
	}

	protected async _on_selection_changed(selection_model: Gtk.MultiSelection<Package>): Promise<void> {
		const bitset = this._selection_model.get_selection()
		const selected: Package[] = []
		const idler = chunked_idler()
		for (let nth = 0; nth < bitset.get_size(); nth += 1) {
			const position = bitset.get_nth(nth)
			const item = selection_model.get_item(position)!
			selected.push(item)
			await idler()
		}
		this._selected_packages.swap_contents(selected)
	}

	protected _on_search_changed(entry: Gtk.SearchEntry): void {
		this.search_text = entry.get_text()
	}

	protected _show_spinner(__: this, is_loading: boolean, pending_sorts: number): boolean {
		return is_loading || pending_sorts > 0
	}
}
