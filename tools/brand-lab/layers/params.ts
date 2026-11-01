import type { ParamDef, Params } from "./types";

type Extra = { step?: number; unit?: string; showIf?: (p: Params) => boolean; shuffle?: boolean | [number, number] };

export const float = (key: string, label: string, min: number, max: number, def: number, extra: Extra = {}): ParamDef => ({
	type: "float",
	key,
	label,
	min,
	max,
	default: def,
	...extra,
});

export const int = (key: string, label: string, min: number, max: number, def: number, extra: Extra = {}): ParamDef => ({
	type: "int",
	key,
	label,
	min,
	max,
	default: def,
	...extra,
});

export const select = (
	key: string,
	label: string,
	options: string[],
	def = 0,
	/** `shuffle: [lo, hi]` limits Shuffle to option values in that range. */
	extra: Pick<Extra, "showIf" | "shuffle"> = {},
): ParamDef => ({
	type: "select",
	key,
	label,
	options: options.map((l, i) => ({ value: i, label: l })),
	default: def,
	...extra,
});

export const bool = (key: string, label: string, def: boolean, extra: Pick<Extra, "showIf" | "shuffle"> = {}): ParamDef => ({
	type: "bool",
	key,
	label,
	default: def,
	...extra,
});

export const color = (key: string, label: string, def: string, extra: Pick<Extra, "showIf"> = {}): ParamDef => ({
	type: "color",
	key,
	label,
	default: def,
	...extra,
});

export const eq = (key: string, ...values: number[]) => (p: Params) => values.includes(p[key] as number);
export const neq = (key: string, ...values: number[]) => (p: Params) => !values.includes(p[key] as number);
export const on = (key: string) => (p: Params) => !!p[key];

/** Loop-safe motion: integer cycles per timeline loop. */
export const cycles = (def = 1, extra: Extra = {}) => int("cycles", "Cycles / loop", 0, 8, def, { shuffle: [0, 3], ...extra });
