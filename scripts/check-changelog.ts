// Keeps the public changelog honest and on voice. The changelog is the first thing other teams and
// candidates read to see how we work, so each entry follows CONTRIBUTING.md's rules: newest first,
// a real date, credited to someone on the team, sentence case titles without a full stop, plain
// sentences without em dashes or "Fix:" style labels.
import { changelog } from "../lib/changelog.ts";
import { team } from "../lib/team.ts";

const errors: string[] = [];
const slugs = new Set(team.map((m) => m.slug));
const today = new Date().toISOString().slice(0, 10);

changelog.forEach((e, i) => {
	const at = `Entry ${i + 1} ("${e.title}")`;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date))) errors.push(`${at}: date must be YYYY-MM-DD.`);
	// Allow a day of slack for time zones: entries are dated in IST, CI runs in UTC.
	else if (e.date > new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10)) errors.push(`${at}: dated in the future.`);
	if (i > 0 && e.date > changelog[i - 1].date) errors.push(`${at}: newer than the entry above it. Newest go first.`);
	if (!slugs.has(e.by)) errors.push(`${at}: "by" must be a slug from lib/team.ts (${[...slugs].join(", ")}).`);
	if (!e.title.trim() || !e.body.trim() || !e.area.trim()) errors.push(`${at}: title, body and area are all required.`);
	if (/[.!]$/.test(e.title.trim())) errors.push(`${at}: no full stop at the end of a title.`);
	if (/^(fix|feat|feature|chore|refactor|update)\b\s*:/i.test(e.title) || /^(fix|feat|feature|chore)\s*:/i.test(e.body)) errors.push(`${at}: no "Fix:" or "Feature:" labels. Say what changed for people.`);
	if (/[—–]/.test(e.title + e.body)) errors.push(`${at}: no em or en dashes. Use a full stop or a comma.`);
	if (!/[.!?]$/.test(e.body.trim())) errors.push(`${at}: the body is sentences, so it ends with a full stop.`);
});

if (errors.length) {
	console.error(`Changelog check failed:\n- ${errors.join("\n- ")}`);
	process.exit(1);
}
console.log(`Changelog check passed (${changelog.length} entries).`);
