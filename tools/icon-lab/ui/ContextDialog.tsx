import { XIcon } from "@icons/icons";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { WrappedSelect } from "@/lib/design-system/jigsaw/components/ui/controls/select/select";
import { Modal, ModalClose, ModalContent, ModalDescription, ModalTitle } from "@/lib/design-system/jigsaw/components/ui/overlays/modal/modal";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { Segmented } from "@/tools/shell/components/controls";
import { Field } from "@/tools/shell/components/field";
import { ICON_NORMAL } from "@/tools/shell/components/icon-button";
import { CONTEXT_DATA } from "../data/context-data";
import type { Icon } from "../engine/types";
import { hasOptions, ofStyle, pretty } from "../state/sets";
import { sizedSvg, useIconLab } from "../state/store";
import { Shot, SITE } from "./ContextPane";
import { Svg } from "./controls";
import { toHex } from "./markup";

// In context: the current icon at real pixel size, where it's used on clueso.io (before and after),
// in UI mockups (light or dark), on a page loaded from a URL, or on a screenshot, with a copy of the
// icon to drag into place.

type Tab = "site" | "mockup" | "url" | "shot";
type S = ReturnType<typeof useIconLab.getState>;

export function ContextDialog() {
	const icon = useIconLab((s) => s.current);
	useIconLab((s) => s.rev);
	const s = useIconLab.getState();
	const [tab, setTab] = useState<Tab>("site");
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [placeSize, setPlaceSize] = useState(20);
	const [placeColor, setPlaceColor] = useState("#111111");
	const close = () => s.openDialog(null);
	const placing = tab === "url" || tab === "shot";

	return (
		<Modal open onOpenChange={(o) => !o && close()}>
			<ModalContent size="large" className="il-dialog h-[min(820px,calc(100vh-32px))] w-[min(1100px,calc(100vw-32px))] max-w-[none] overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
				<header className="flex shrink-0 flex-wrap items-center gap-lg border-b border-weak py-lg pr-lg pl-2xl">
					<ModalTitle className="label-medium-strong">
						In context{" "}
						<span className="mono-xsmall text-weak">
							{pretty(icon.name)}
							{hasOptions(icon) ? ` · ${icon.variant}` : ""}
						</span>
					</ModalTitle>
					<ModalDescription className="sr-only">The icon on clueso.io, in mockups, on a page or on a screenshot</ModalDescription>
					<Segmented
						size="button"
						label="Preview type"
						value={tab}
						options={[
							{ value: "site", label: "On clueso.io" },
							{ value: "mockup", label: "Sizes" },
							{ value: "url", label: "URL" },
							{ value: "shot", label: "Screenshot" },
						]}
						onChange={setTab}
					/>
					{/* Light / Dark sets the mockup, the URL and screenshot backgrounds, and the placed icon's colour. */}
					{tab !== "site" && (
						<Segmented
							size="button"
							label="Theme"
							value={theme}
							options={[
								{ value: "light", label: "Light" },
								{ value: "dark", label: "Dark" },
							]}
							onChange={(t) => {
								setTheme(t);
								setPlaceColor(t === "dark" ? "#f5f3e7" : "#111111");
							}}
						/>
					)}
					<ModalClose asChild>
						<Button iconClassName={ICON_NORMAL} variant="transparent" sentiment="neutral" size="small" iconOnly icon={<XIcon />} aria-label="Close" className="ml-auto" />
					</ModalClose>
				</header>
				<div className="il-icon min-h-0 flex-1 overflow-auto p-2xl">
					{tab === "site" && <SiteTab s={s} icon={icon} />}
					{tab === "mockup" && <Mockup s={s} icon={icon} theme={theme} />}
					{tab === "url" && <UrlTab s={s} theme={theme} placed={<Placed s={s} icon={icon} size={placeSize} color={placeColor} />} />}
					{tab === "shot" && <ShotTab theme={theme} placed={<Placed s={s} icon={icon} size={placeSize} color={placeColor} />} />}
				</div>
				{placing && (
					<div className="flex shrink-0 items-center gap-md border-t border-weak px-2xl py-md">
						<span className="mono-xxsmall text-weak">Icon</span>
						<WrappedSelect
							aria-label="Icon size"
							className="w-[90px]"
							value={String(placeSize)}
							options={[16, 20, 24, 32].map((n) => ({ value: String(n), label: `${n} px` }))}
							onValueChange={(v) => setPlaceSize(Number(v))}
						/>
						<input type="color" aria-label="Icon colour" value={placeColor} onChange={(e) => setPlaceColor(e.target.value)} className="h-[24px] w-[40px] cursor-pointer rounded-xs border border-weak bg-transparent" />
						<span className="para-xxsmall text-weak">Drag the icon to place it.</span>
					</div>
				)}
			</ModalContent>
		</Modal>
	);
}

// On clueso.io: before and after, side by side, at the same scale, plus a close-up of both.
function SiteTab({ s, icon }: { s: S; icon: Icon }) {
	const d = CONTEXT_DATA[icon.name];
	if (!d)
		return (
			<p className="para-small text-weak">
				{icon.site && icon.pages ? "No capture of this icon on clueso.io yet. Run tools/capture-context.js to add it." : "This icon isn't used on clueso.io yet. Use Sizes, URL or Screenshot to try it out."}
			</p>
		);
	const color = toHex(d.color);
	const pages = icon.pages ? `${icon.pages.toLocaleString("en-GB")} page${icon.pages === 1 ? "" : "s"} use it` : "";
	const fig = "flex flex-col gap-sm";
	const cap = "mono-xxsmall uppercase text-weak";
	return (
		<div className="flex flex-col gap-lg">
			<p className="para-small flex flex-wrap items-baseline gap-x-lg gap-y-xs text-strong">
				<span>
					On{" "}
					<a href={`${SITE}${d.url}`} target="_blank" rel="noopener noreferrer" className="underline decoration-(--color-fg-stroke-normal) underline-offset-2">
						clueso.io{d.url}
					</a>
				</span>
				<span className="para-xsmall text-weak">
					{pages} · replaces {icon.replaces || ""}
				</span>
			</p>
			<div className="grid grid-cols-2 gap-lg">
				<figure className={fig}>
					<figcaption className={cap}>Before · on the site today</figcaption>
					<Shot s={s} icon={icon} after={false} mark color={color} />
				</figure>
				<figure className={fig}>
					<figcaption className={cap}>
						After · {pretty(icon.name)}, {icon.style === "line" ? `stroke ${s.stroke}` : "solid"}, {s.round ? "rounded" : "sharp"}
					</figcaption>
					<Shot s={s} icon={icon} after mark color={color} />
				</figure>
			</div>
			<div className="grid grid-cols-2 gap-lg">
				<figure className={fig}>
					<figcaption className={cap}>Before · close-up</figcaption>
					<Zoom s={s} icon={icon} after={false} color={color} />
				</figure>
				<figure className={fig}>
					<figcaption className={cap}>After · close-up</figcaption>
					<Zoom s={s} icon={icon} after color={color} />
				</figure>
			</div>
		</div>
	);
}

// Close-up: a region 8 icons wide around the icon, in a 2 : 1 frame.
function Zoom({ s, icon, after, color }: { s: S; icon: Icon; after: boolean; color: string }) {
	const d = CONTEXT_DATA[icon.name];
	const bg = toHex(d.bg);
	const pct = (v: number, of: number) => `${(v / of) * 100}%`;
	const R = Math.max(d.box.w * 8, 120);
	const zx = d.box.x + d.box.w / 2 - R / 2;
	const zy = d.box.y + d.box.h / 2 - R / 4;
	return (
		<div className="il-shot il-zoom">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={`/tools/icon-lab/${d.image}`} alt="" draggable={false} style={{ width: pct(d.size.w, R), left: pct(-zx, R), top: pct(-zy, R / 2) }} />
			{after && (
				<div
					className="il-patch"
					style={{ left: pct(d.box.x - zx, R), top: pct(d.box.y - zy, R / 2), width: pct(d.box.w, R), height: pct(d.box.h, R / 2), background: bg, boxShadow: `0 0 0 2px ${bg}` }}
					dangerouslySetInnerHTML={{ __html: sizedSvg(s, icon, Math.round(d.box.w), color) }}
				/>
			)}
		</div>
	);
}

// Mockups: plain UI at real pixel sizes, light or dark, with a few icons from the same set beside it.
function Mockup({ s, icon, theme }: { s: S; icon: Icon; theme: "light" | "dark" }) {
	const others = ofStyle(icon.style)
		.filter((i) => i !== icon)
		.slice(0, 3);
	const ink = theme === "dark" ? "#f5f3e7" : "#111111";
	const bg = theme === "dark" ? "#0e0e0e" : "#ffffff";
	const I = (ic: Icon, size: number, color = ink) => <Svg markup={sizedSvg(s, ic, size, color)} />;
	const nm = pretty(icon.name);
	const other = others[0] || icon;
	return (
		<div className={cn("il-mockup", theme === "dark" && "il-dark")}>
			<div>
				<div className="il-m-label">Navigation · 20 px</div>
				<div className="il-m-nav">
					<strong>Clueso</strong>
					<span>Product</span>
					<span>Pricing</span>
					{I(other, 20)}
					{I(icon, 20)}
				</div>
			</div>
			<div>
				<div className="il-m-label">Buttons · 16 px with a label, 20 px icon-only</div>
				<div className="il-m-row">
					<span className="il-m-btn il-primary">
						{I(icon, 16, bg)}
						{nm}
					</span>
					<span className="il-m-btn">
						{I(icon, 16)}
						{nm}
					</span>
					<span className="il-m-btn il-only" aria-label={nm}>
						{I(icon, 20)}
					</span>
					{others.map((o) => (
						<span key={o.name} className="il-m-btn il-only" aria-label={pretty(o.name)}>
							{I(o, 20)}
						</span>
					))}
				</div>
			</div>
			<div>
				<div className="il-m-label">List · 20 px, next to others in the set</div>
				<div className="il-m-list">
					{[icon, ...others].map((o) => (
						<div key={o.name} className={cn(o === icon && "il-cur")}>
							{I(o, 20)}
							<span>{pretty(o.name)}</span>
						</div>
					))}
				</div>
			</div>
			<div>
				<div className="il-m-label">Cards · 24 px</div>
				<div className="il-m-cards">
					{[icon, ...others.slice(0, 2)].map((o) => (
						<div key={o.name} className="il-m-card">
							<div className="il-tile">
								{I(o, 24)}
							</div>
							<strong>{pretty(o.name)}</strong>
							<p>A short line of supporting copy.</p>
						</div>
					))}
				</div>
			</div>
			<div className="il-m-inline">
				<div className="il-m-label">Inline with 14 px text · 16 px</div>
				<p>
					Select {I(icon, 16)} {nm} to start, then {I(other, 16)} to continue.
				</p>
			</div>
			<div>
				<div className="il-m-label">Size ramp</div>
				<div className="il-m-ramp">
					{[16, 20, 24, 32, 48].map((sz) => (
						<figure key={sz}>
							{I(icon, sz)}
							<figcaption>{sz}</figcaption>
						</figure>
					))}
				</div>
			</div>
		</div>
	);
}

/** The icon to drag into place on a page or a screenshot. Iframes stop taking the pointer while dragging. */
function Placed({ s, icon, size, color }: { s: S; icon: Icon; size: number; color: string }) {
	const [pos, setPos] = useState({ left: 40, top: 40 });
	const drag = useRef<{ dx: number; dy: number; stage: HTMLElement } | null>(null);
	const [dragging, setDragging] = useState(false);
	return (
		<div
			className={cn("il-place", dragging && "il-dragging")}
			title="Drag to place"
			style={pos}
			onPointerDown={(e) => {
				e.preventDefault();
				const r = e.currentTarget.getBoundingClientRect();
				drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, stage: e.currentTarget.parentElement! };
				e.currentTarget.setPointerCapture(e.pointerId);
				setDragging(true);
			}}
			onPointerMove={(e) => {
				const d = drag.current;
				if (!d) return;
				const r = d.stage.getBoundingClientRect();
				setPos({ left: Math.round(e.clientX - r.left - d.dx + d.stage.scrollLeft), top: Math.round(e.clientY - r.top - d.dy + d.stage.scrollTop) });
			}}
			onPointerUp={() => {
				drag.current = null;
				setDragging(false);
			}}
			onPointerCancel={() => {
				drag.current = null;
				setDragging(false);
			}}
			dangerouslySetInnerHTML={{ __html: sizedSvg(s, icon, size, color) }}
		/>
	);
}

function UrlTab({ s, theme, placed }: { s: S; theme: "light" | "dark"; placed: React.ReactNode }) {
	const [input, setInput] = useState("");
	const [url, setUrl] = useState("");
	return (
		<div className="flex flex-col gap-md">
			<form
				className="flex gap-sm"
				onSubmit={(e) => {
					e.preventDefault();
					let next = input.trim();
					if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
					try {
						setUrl(new URL(next).href);
					} catch {
						s.setStatus("That URL is not valid.", true);
					}
				}}
			>
				<Field type="url" size="small" required className="flex-1" placeholder="Paste a page URL, e.g. https://www.clueso.io/pricing" value={input} onChange={(e) => setInput(e.target.value)} />
				<Button type="submit" variant="filled" sentiment="neutral" size="small">
					Load
				</Button>
			</form>
			<p className="para-xxsmall text-weak">
				The page loads below at real size. Drag the icon onto the spot you want to check. If the page stays blank, the site doesn&apos;t allow being shown inside another page: take a screenshot and use the Screenshot tab.
			</p>
			<div className={cn("il-stage-frame h-[560px] overflow-hidden", theme === "dark" && "il-dark")}>
				{url && <iframe src={url} title="Page preview" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms" className="block size-full border-0 bg-white" />}
				{placed}
			</div>
		</div>
	);
}

// Screenshots: Retina captures are twice the size on screen, so they show at half by default.
function ShotTab({ theme, placed }: { theme: "light" | "dark"; placed: React.ReactNode }) {
	const [src, setSrc] = useState<string | null>(null);
	const [natural, setNatural] = useState(0);
	const [scale, setScale] = useState(2);
	const [over, setOver] = useState(false);
	useEffect(() => () => (src ? URL.revokeObjectURL(src) : undefined), [src]);
	const load = (file?: File | null) => {
		if (!file || !/^image\//.test(file.type)) return;
		setNatural(0);
		setSrc(URL.createObjectURL(file));
	};
	const shown = natural ? Math.round(natural / scale) : 0;
	return (
		<div className="flex flex-col gap-md">
			<div className="flex flex-wrap items-center gap-md">
				<label className="cursor-pointer">
					<input type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
					<span className="label-xsmall inline-flex h-[28px] items-center rounded-xs border border-normal px-md text-strong hover:bg-interaction-hover-subtle">Choose a screenshot</span>
				</label>
				<span className="para-xxsmall text-weak">or drop one here. Shown at</span>
				<Segmented
					label="Screenshot scale"
					value={scale}
					options={[
						{ value: 2, label: "Retina (½ size)" },
						{ value: 1, label: "1×" },
					]}
					onChange={setScale}
				/>
				<span className="para-xxsmall text-weak">{natural ? `· showing ${shown} px wide (file is ${natural} px)` : ""}</span>
			</div>
			<div
				className={cn("il-stage-frame min-h-[420px] overflow-auto", theme === "dark" && "il-dark", over && "il-dragover")}
				onDragOver={(e) => {
					e.preventDefault();
					setOver(true);
				}}
				onDragLeave={() => setOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setOver(false);
					load(e.dataTransfer?.files[0]);
				}}
			>
				{src ? (
					// A local file the visitor chose; next/image adds nothing here.
					// eslint-disable-next-line @next/next/no-img-element
					<img src={src} alt="Screenshot" className="block max-w-none" style={shown ? { width: shown, height: "auto" } : undefined} onLoad={(e) => setNatural(e.currentTarget.naturalWidth)} />
				) : (
					<p className="para-small absolute inset-0 m-0 grid place-items-center text-weak">Drop a screenshot here</p>
				)}
				{placed}
			</div>
		</div>
	);
}
