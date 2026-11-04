// Brand Lab presets saved as files (tools/brand-lab/presets): every file must be listed in the folder's
// index.ts, and be a valid preset, so a preset added to the folder can't silently go missing or break.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "tools/brand-lab/presets";
const GROUPS = ["Posters", "Illustrations", "Patterns"];
const index = readFileSync(join(DIR, "index.ts"), "utf8");
const errors: string[] = [];
const files = readdirSync(DIR).filter((f) => f.endsWith(".brandlab.json"));

for (const f of files) {
	if (!/^[a-z0-9-]+\.brandlab\.json$/.test(f)) errors.push(`${f}: use lowercase words and hyphens, like made-of-pieces.brandlab.json`);
	if (!index.includes(`"./${f}"`)) errors.push(`${f}: not listed in ${DIR}/index.ts`);
	try {
		const p = JSON.parse(readFileSync(join(DIR, f), "utf8"));
		if (p.version !== 2) errors.push(`${f}: "version" must be 2`);
		if (!p.name || typeof p.name !== "string") errors.push(`${f}: needs a "name"`);
		if (!GROUPS.includes(p.group)) errors.push(`${f}: "group" must be one of ${GROUPS.join(", ")}`);
		const c = p.canvases?.[0];
		if (p.canvases?.length !== 1 || c?.version !== 1 || !c?.scene || !Array.isArray(c?.layers)) errors.push(`${f}: needs exactly one canvas with a scene and layers`);
	} catch {
		errors.push(`${f}: not valid JSON`);
	}
}
for (const m of index.matchAll(/"\.\/([^"]+\.brandlab\.json)"/g)) if (!files.includes(m[1])) errors.push(`index.ts lists ${m[1]}, which isn't in ${DIR}`);

if (errors.length) {
	console.error(`Preset check failed:\n- ${errors.join("\n- ")}`);
	process.exit(1);
}
console.log(`Preset check passed (${files.length} preset files).`);
