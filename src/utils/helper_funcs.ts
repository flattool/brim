import type GObject from "gi://GObject?version=2.0"
import Gtk from "gi://Gtk?version=4.0"
import { next_idle } from "../gobjectify/gobjectify.js"

export const string_format_spec = <const T extends string[]>(...strings: T): {
	format: string,
	parse_and_validate(input: string): { [Key in T[number]]: string } | false,
} => ({
	format: "{ " + strings.map((str) => `"${str}": "%{${str}}"`).join(", ") + " }\\n",
	parse_and_validate(input: string): { [Key in T[number]]: string } | false {
		const value = JSON.parse(input)
		for (const str of strings) {
			if (typeof value[str] !== "string") {
				return false
			}
		}
		return value
	},
})

export const chunked_idler = (chunk_size = 10) => {
	let iteration = 0
	return async (): Promise<void> => {
		if (iteration === chunk_size) {
			iteration = 0
			await next_idle()
		} else {
			iteration += 1
		}
	}
}

// type ColumnFactoryOptions<Data extends GObject.Object, Widget extends Gtk.Widget> = {
// 	readonly bind: SignalFactoryBoundFunc,
// }

export const make_signal_factory = <Widget extends Gtk.Widget, Data extends GObject.Object>(
	widget_class: abstract new (...args: any[])=> Widget,
	data_class: abstract new (...args: any[])=> Data,
	callbacks: {
		readonly setup: (item: Gtk.ListItem)=> Widget,
		readonly bind: (widget: Widget, data: Data, item: Gtk.ListItem)=> void,
		readonly unbind?: (widget: Widget, data: Data, item: Gtk.ListItem)=> void,
		readonly tear_down?: (widget: Widget)=> void,
	},
): Gtk.SignalListItemFactory => {
	void widget_class, data_class
	const factory = new Gtk.SignalListItemFactory()
	factory.connect("setup", (__, list_item: Gtk.ListItem) => list_item.set_child(callbacks.setup(list_item)))
	factory.connect("bind", (__, list_item: Gtk.ListItem) => callbacks.bind(
		list_item.get_child() as Widget,
		list_item.item as Data,
		list_item,
	))
	factory.connect("unbind", (__, list_item: Gtk.ListItem) => callbacks.unbind?.(
		list_item.get_child() as Widget,
		list_item.item as Data,
		list_item,
	))
	factory.connect("teardown", (__, list_item: Gtk.ListItem) => callbacks.tear_down?.(list_item.get_child() as Widget))
	return factory
}
