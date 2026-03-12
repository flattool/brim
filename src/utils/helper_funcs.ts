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
