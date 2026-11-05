import { useState } from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { WrappedSelect } from "@/lib/design-system/jigsaw/components/ui/controls/select/select";
import { Textarea } from "@/lib/design-system/jigsaw/components/ui/controls/textarea/textarea";
import { Modal, ModalContent, ModalDescription, ModalTitle } from "@/lib/design-system/jigsaw/components/ui/overlays/modal/modal";
import { Field } from "@/tools/shell/components/field";
import { KEYS, storage } from "../state/storage";
import { apiKey, useIconLab } from "../state/store";

/** A small modal with a title, a body and the actions at the end, like the standalone app's dialogs. */
function Dialog({ title, description, onClose, children }: { title: string; description: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
	return (
		<Modal open onOpenChange={(o) => !o && onClose()}>
			<ModalContent size="small" className="w-[400px] max-w-[calc(100vw-32px)] gap-lg p-2xl">
				<ModalTitle className="label-medium-strong">{title}</ModalTitle>
				<ModalDescription asChild>
					<div className="para-small flex flex-col gap-md text-normal">{description}</div>
				</ModalDescription>
				{children}
			</ModalContent>
		</Modal>
	);
}

// ---- Claude key ----------------------------------------------------------------
// The visitor's own Anthropic key, kept only in this browser (iconTool.apiKey). Parked with prompt
// drawing: see CLAUDE_DRAWING in Toolbar.tsx.
export function KeyDialog() {
	const close = () => useIconLab.getState().openDialog(null);
	const { saveKey, removeKey } = useIconLab.getState();
	const [value, setValue] = useState("");
	const saved = Boolean(apiKey());
	return (
		<Dialog
			title="Connect Claude"
			onClose={close}
			description={
				<>
					<p>Paste an Anthropic API key to draw new icons from prompts. Keys come from the Anthropic Console (console.anthropic.com → API keys). A claude.ai login won&apos;t work here.</p>
					<p className="text-weak">The key is stored only in this browser and sent only to the Claude API. Each prompt draws 3 options with Claude Opus 5.5 and is billed to the key&apos;s account.</p>
				</>
			}
		>
			<form
				className="flex flex-col gap-lg"
				onSubmit={(e) => {
					e.preventDefault();
					if (value.trim()) saveKey(value.trim());
					close();
				}}
			>
				<Field
					type="password"
					size="small"
					autoFocus
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={saved ? "Key saved. Paste a new one to replace it." : "sk-ant-…"}
					autoComplete="off"
					spellCheck={false}
					aria-label="Anthropic API key"
					inputClassName="font-mono"
				/>
				<div className="flex items-center gap-sm">
					<Button type="submit" variant="filled" sentiment="neutral" size="small">
						Save key
					</Button>
					<Button type="button" variant="outlined" sentiment="neutral" size="small" onClick={close}>
						Cancel
					</Button>
					{saved && (
						<Button
							type="button"
							variant="link"
							sentiment="neutral"
							size="small"
							className="ml-auto"
							onClick={() => {
								removeKey();
								close();
							}}
						>
							Remove key
						</Button>
					)}
				</div>
			</form>
		</Dialog>
	);
}

// ---- Icon requests ------------------------------------------------------------------
// There's no backend yet, so a request opens an email to the design team (or is copied for
// Discord) and is kept in this browser (iconTool.requests).
const REQUEST_TO = "sneha@clueso.io"; // the design team's inbox for icon requests (change when there's a shared one)
const WHERE = ["Website", "Platform", "Both", "Not sure"];

function keepRequest(request: { subject: string; body: string }) {
	try {
		const list = JSON.parse(storage.getItem(KEYS.requests) || "[]");
		list.push({ ...request, at: new Date().toISOString() });
		storage.setItem(KEYS.requests, JSON.stringify(list));
	} catch {
		// not kept
	}
}

export function RequestDialog() {
	const close = () => useIconLab.getState().openDialog(null);
	const setStatus = useIconLab((s) => s.setStatus);
	const [name, setName] = useState(() => useIconLab.getState().requestName);
	const [where, setWhere] = useState(WHERE[0]);
	const [notes, setNotes] = useState("");
	const [from, setFrom] = useState("");
	const [sent, setSent] = useState<string | null>(null);
	const request = () => ({
		subject: `Icon request: ${name.trim()}`,
		body: `Icon: ${name.trim()}\nWhere: ${where}\nWhat it's for: ${notes.trim() || "-"}\nFrom: ${from.trim() || "-"}\n\n(Sent from Icon Lab)`,
	});
	const label = "label-xsmall flex flex-col gap-xs text-normal";

	return (
		<Dialog title="Request an icon" onClose={close} description={<p className="text-weak">It goes to the Clueso design team. Say what it&apos;s for, and they&apos;ll draw it in the set&apos;s style.</p>}>
			<form
				className="flex flex-col gap-md"
				onSubmit={(e) => {
					e.preventDefault();
					const { subject, body } = request();
					keepRequest(request());
					window.location.href = `mailto:${REQUEST_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
					setStatus("Request opened in your email. Thanks!");
					close();
				}}
			>
				<label className={label}>
					Icon
					<Field size="small" required autoComplete="off" placeholder="e.g. Hourglass" value={name} onChange={(e) => setName(e.target.value)} />
				</label>
				<div className={label}>
					Where
					<WrappedSelect aria-label="Where" size="small" className="w-full" value={where} options={WHERE.map((w) => ({ value: w, label: w }))} onValueChange={setWhere} />
				</div>
				<label className={label}>
					What it&apos;s for
					<Textarea rows={3} placeholder="The page or feature, and what it should say" value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-y" />
				</label>
				<label className={label}>
					Your name
					<Field size="small" autoComplete="name" value={from} onChange={(e) => setFrom(e.target.value)} />
				</label>
				<div className="mt-xs flex flex-wrap items-center gap-sm">
					<Button type="submit" variant="filled" sentiment="neutral" size="small">
						Send by email
					</Button>
					<Button
						type="button"
						variant="outlined"
						sentiment="neutral"
						size="small"
						onClick={async () => {
							const { subject, body } = request();
							keepRequest(request());
							try {
								await navigator.clipboard.writeText(`${subject}\n${body}`);
								setSent("Copied. Paste it in the design team’s Discord channel.");
							} catch {
								setSent("Couldn’t copy here. Use Send by email instead.");
							}
						}}
					>
						Copy for Discord
					</Button>
					<Button type="button" variant="transparent" sentiment="neutral" size="small" onClick={close}>
						Cancel
					</Button>
				</div>
				{sent && <p className="para-xxsmall text-weak">{sent}</p>}
			</form>
		</Dialog>
	);
}
