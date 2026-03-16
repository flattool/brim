import Gio from "gi://Gio?version=2.0"
import Gtk from "gi://Gtk?version=4.0"
import Adw from "gi://Adw?version=1"
import Pango from "gi://Pango?version=1.0"

import { GClass, SimpleAction, Property, Child, from, OnSimpleAction } from "../gobjectify/gobjectify.js"
import { SharedVars } from "../utils/shared_vars.js"
import { Package } from "../dnf.js"
import { ListStore } from "../list_store.js"
import { make_signal_factory } from "../utils/helper_funcs.js"

import { DetailsPage } from "../details_page/details_page.js"
import GObject from "gi://GObject?version=2.0"
import GLib from "gi://GLib?version=2.0"

@GClass({ template: "resource:///io/github/flattool/Brim/window/main_window.ui" })
export class MainWindow extends from(Adw.ApplicationWindow, {
	search_text: Property.string(),
	is_loading: Property.bool({ default: true }),
	pkg_right_clicked: SimpleAction({ parameter_type: new GLib.VariantType("u") }),
	_packages: Child<ListStore<Package>>(),
	_column_view: Child<Gtk.ColumnView>(),
	_selection_model: Child<Gtk.MultiSelection<Package>>(),

	_selected_column: Child<Gtk.ColumnViewColumn>(),
	_name_column: Child<Gtk.ColumnViewColumn>(),
	_version_column: Child<Gtk.ColumnViewColumn>(),
	_arch_column: Child<Gtk.ColumnViewColumn>(),
	_repo_column: Child<Gtk.ColumnViewColumn>(),
	_installed_column: Child<Gtk.ColumnViewColumn>(),
	_toast_overlay: Child<Adw.ToastOverlay>(),
	_details_page: Child<DetailsPage>(),
}) {
	readonly #settings = new Gio.Settings({ schema_id: pkg.app_id })
	readonly #handler_ids = new WeakMap<Gtk.CheckButton, number>()
	readonly #bound_checks = new Map<number, Gtk.CheckButton>()

	async _ready(): Promise<void> {
		if (pkg.profile === "development") this.add_css_class("devel")
		print(`Welcome to ${pkg.app_id}!`)

		this.connect("unrealize", () => {
			this._column_view.set_model(null)
			const columns = this._column_view.get_columns()
			while (true) {
				const column = columns.get_item(0) as Gtk.ColumnViewColumn | null
				if (!column) break
				column.set_factory(null)
				this._column_view.remove_column(column)
			}
		})

		this._selected_column.set_factory(make_signal_factory(Gtk.CheckButton, Package, {
			setup: (list_item) => {
				const check = new Gtk.CheckButton({ valign: Gtk.Align.CENTER })
				const handler_id = check.connect("toggled", () => {
					const pos = list_item.get_position()
					if (pos === Gtk.INVALID_LIST_POSITION) return
					GObject.signal_handler_block(check, handler_id)
					if (check.active) {
						this._selection_model.select_item(pos, false)
					} else {
						this._selection_model.unselect_item(pos)
					}
					GObject.signal_handler_unblock(check, handler_id)
				})
				this.#handler_ids.set(check, handler_id)
				return check
			},
			bind: (check, _pkg, item) => {
				const pos = item.get_position()
				const handler_id = this.#handler_ids.get(check)!
				GObject.signal_handler_block(check, handler_id)
				check.active = this._selection_model.is_selected(pos)
				GObject.signal_handler_unblock(check, handler_id)
				this.#bound_checks.set(pos, check)
			},
			unbind: (_check, _pkg, item) => this.#bound_checks.delete(item.get_position()),
			tear_down: (check) => this.#handler_ids.delete(check),
		}))
		this._name_column.set_factory(make_signal_factory(Gtk.Inscription, Package, {
			setup: () => new Gtk.Inscription({
				text: "Hello, World!",
				text_overflow: Gtk.InscriptionOverflow.ELLIPSIZE_MIDDLE,
				min_chars: 10,
				nat_chars: 30,
				hexpand: true,
				valign: Gtk.Align.FILL,
				vexpand: true,
			}),
			bind: (inscription, pkg) => inscription.text = pkg.name,
			unbind: (inscription) => inscription.text = "",
		}))
		this._version_column.set_factory(make_signal_factory(Gtk.Inscription, Package, {
			setup: () => new Gtk.Inscription({
				text_overflow: Gtk.InscriptionOverflow.ELLIPSIZE_END,
				min_chars: 10,
				nat_chars: 15,
			}),
			bind: (inscription, pkg) => inscription.text = pkg.version,
			unbind: (inscription) => inscription.text = "",
		}))
		this._arch_column.set_factory(make_signal_factory(Gtk.Inscription, Package, {
			setup: () => new Gtk.Inscription({
				text_overflow: Gtk.InscriptionOverflow.ELLIPSIZE_END,
				min_chars: 6,
				nat_chars: 10,
			}),
			bind: (inscription, pkg) => inscription.text = pkg.arch,
			unbind: (inscription) => inscription.text = "",
		}))
		this._repo_column.set_factory(make_signal_factory(Gtk.Inscription, Package, {
			setup: () => new Gtk.Inscription({
				text_overflow: Gtk.InscriptionOverflow.ELLIPSIZE_END,
				min_chars: 10,
				nat_chars: 15,
			}),
			bind: (inscription, pkg) => inscription.text = pkg.repoid,
			unbind: (inscription) => inscription.text = "",
		}))
		this._installed_column.set_factory(make_signal_factory(Gtk.Image, Package, {
			setup: () => new Gtk.Image({ icon_name: "archive-symbolic" }),
			bind: (image, pkg) => image.visible = pkg.installed,
			unbind: (image) => image.visible = false,
		}))

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

	@OnSimpleAction("pkg_right_clicked")
	#on_pkg_right_clicked(_action: Gio.SimpleAction, param: GLib.Variant): void {
		const index = param.get_uint32()
		if (this._selection_model.is_selected(index)) {
			this._selection_model.unselect_item(index)
		} else {
			this._selection_model.select_item(index, false)
		}
	}

	protected _on_selection_changed(_model: Gtk.MultiSelection<Package>, position: number, n_items: number): void {
		const end = position + n_items
		for (let pos = position; pos < end; pos += 1) {
			const check = this.#bound_checks.get(pos)
			if (!check) continue
			const handler_id = this.#handler_ids.get(check)!
			GObject.signal_handler_block(check, handler_id)
			const is_selected = this._selection_model.is_selected(pos)
			check.active = is_selected
			GObject.signal_handler_unblock(check, handler_id)
		}
		const bitset = this._selection_model.get_selection()
		const first = bitset.get_nth(0)
		this._details_page.selection_changed(this._selection_model.vfunc_get_item(first), bitset.get_size())
	}

	protected _on_search_changed(entry: Gtk.SearchEntry): void {
		this.search_text = entry.get_text()
	}

	protected _show_spinner(__: this, is_loading: boolean, pending_sorts: number): boolean {
		return is_loading || pending_sorts > 0
	}
}

void @GClass() class RightClickContainer extends from(Adw.Bin, {
	action_name: Property.string(),
	action_target: Property.uint32(),
}) {
	_ready(): void {
		const gesture = new Gtk.GestureClick({ button: 3 })
		gesture.connect("pressed", () => {
			this.activate_action(this.action_name, GLib.Variant.new_uint32(this.action_target))
		})
		this.get_parent()?.add_controller(gesture)
	}
}
