// Fails the build if the registry is incomplete or could leak internal work.
// There is no sign-in yet, so an internal item must not have a page in app/. When sign-in ships,
// this check changes to "internal routes must sit behind the middleware gate".
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registry } from "../lib/registry.ts";

const errors: string[] = [];
const seen = new Set<string>();

for (const item of registry) {
	if (seen.has(item.slug)) errors.push(`Duplicate slug: ${item.slug}`);
	seen.add(item.slug);
	for (const key of ["owner", "status", "visibility", "theme", "description"] as const) {
		if (!item[key]) errors.push(`${item.slug}: missing ${key}`);
	}
	if (item.visibility === "internal" && item.href.startsWith("/")) {
		const segments = item.href.split("/").filter(Boolean);
		const candidates = [join("app", ...segments), join("app", "(site)", ...segments), join("app", "(tool)", ...segments)];
		if (candidates.some((dir) => existsSync(join(dir, "page.tsx")))) {
			errors.push(`${item.slug} is internal but has a public page at ${item.href}. Add sign-in first, or make it public.`);
		}
	}
}

if (errors.length) {
	console.error(`Registry check failed:\n- ${errors.join("\n- ")}`);
	process.exit(1);
}
console.log(`Registry check passed (${registry.length} items).`);
