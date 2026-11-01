// Keeps site code on token architecture v1. Jigsaw's own class names (text-strong, bg-canvas,
// label-*, para-* ...) are allowed only inside the Jigsaw snapshot and Brand Lab, which predate v1.
// Everywhere else: v1 utilities only, and no hardcoded colours.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "templates"];
const rules: [RegExp, string][] = [
	[/\b(?:bg|text|border|fill|stroke)-\[#/, "Hardcoded colour. Use a v1 token utility."],
	[/#[0-9a-fA-F]{3,8}\b(?![^"'`]*\.svg)/, "Hex colour in site code. Use a v1 token."],
	[/\b(?:text-(?:strong|normal|weak|inverted)|bg-(?:canvas|surface|weak|normal|strong|inverted)|border-(?:weak|normal|strong))\b/, "Jigsaw neutral name. Use the v1 name with 'neutral', e.g. text-neutral-strong."],
	[/\b(?:label|para|title)-(?:xxsmall|xsmall|small|medium|large|xlarge)\b/, "Jigsaw type utility. Use type-title-* or type-text-*."],
	[/\bmax-w-(?:xs|sm|md|lg|xl|[2-7]xl)\b/, "Collides with Jigsaw's spacing scale. Use max-w-page, max-w-measure-wide or max-w-measure."],
	[/\brounded(?:-[trblse]{1,2})?-(?:2xs|xs|sm|md|lg|xl|[2-4]xl|full|round)\b|\brounded(?:-[trblse]{1,2})?-\[/, "Use rounded-tiny (2px), rounded-small (4px), rounded-medium (8px) or rounded-large (12px). Nothing above 12px."],
	[/from ["']@\/lib\/design-system\/jigsaw\//, "Import from @/lib/design-system, not the snapshot directly."],
	[/from ["']@\/components\/ui/, "Import from @/lib/design-system, not components/ui."],
];

function* files(dir: string): Generator<string> {
	let entries: string[] = [];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* files(path);
		else if (/\.(tsx?|css)$/.test(name) && !name.endsWith("globals.css")) yield path;
	}
}

const problems: string[] = [];
for (const root of ROOTS) {
	for (const file of files(root)) {
		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, i) => {
				for (const [re, message] of rules) if (re.test(line)) problems.push(`${file}:${i + 1}  ${message}`);
			});
	}
}

if (problems.length) {
	console.error(`Style check failed:\n${problems.join("\n")}`);
	process.exit(1);
}
console.log("Style check passed.");
