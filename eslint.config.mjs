import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

const config = [
	...next,
	...ts,
	{ ignores: [".next/**", "node_modules/**", "next-env.d.ts", "lib/design-system/jigsaw/**", "public/**"] },
	{
		// Brand Lab was written before these React Compiler rules existed and works as is. They warn
		// here instead of failing, and get fixed during the harness extraction, with Brand Lab's
		// behaviour checked against its baseline. New code gets the full rules.
		files: ["tools/brand-lab/**"],
		rules: {
			"react-hooks/refs": "warn",
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/rules-of-hooks": "warn",
			"react/no-unescaped-entities": "warn",
			"@next/next/no-img-element": "off",
		},
	},
];

export default config;
