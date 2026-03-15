import Gio from "gi://Gio?version=2.0"
import GObject from "gi://GObject?version=2.0"

import { GClass, Property, from } from "./gobjectify/gobjectify.js"

@GClass()
export class ListStore<T extends GObject.Object> extends from(
	GObject.Object,
	{},
	Gio.ListModel,
) implements Gio.ListModel.Interface<T> {
	#items: T[] = []

	get length(): number {
		return this.#items.length
	}

	append(item: T): void {
		this.#items.push(item)
		this.with_implements.items_changed(this.#items.length - 1, 0, 1)
	}

	remove(position: number): void {
		this.#items.splice(position, 1)
		this.with_implements.items_changed(position, 1, 0)
	}

	swap_contents(contents: T[]): void {
		const old_length = this.#items.length
		this.#items = contents
		this.with_implements.items_changed(0, old_length, this.#items.length)
	}

	remove_all(): void {
		const old_length = this.#items.length
		this.#items = []
		this.with_implements.items_changed(0, old_length, 0)
	}

	index_of(item: T): number {
		return this.#items.indexOf(item)
	}

	vfunc_get_item_type(): GObject.GType {
		return GObject.Object.$gtype
	}

	vfunc_get_n_items(): number {
		return this.length
	}

	vfunc_get_item(position: number): T | null {
		return this.#items[position] || null
	}

	get [Symbol.iterator](): IterableIterator<T> {
		return this.#items[Symbol.iterator]()
	}
}
