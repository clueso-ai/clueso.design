import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/design-system/jigsaw/lib/utils";
import { CONTEXT_DATA } from "../data/context-data";
import { ORIGINAL_ICONS } from "../data/originals";
import type { Icon } from "../engine/types";
import { pixelIcons, pretty } from "../state/sets";
import { sizedSvg, useIconLab } from "../state/store";
import { Svg } from "./controls";
import { toHex } from "./markup";

// Context: the icon where it's used. On clueso.io: the captured spot, today's icon (Now) and ours laid
// over it (New). In the product: the same small app UI drawn with the current library icon and with
// ours, light and dark. Pixel icons, a website-only direction, show web uses at web sizes.

export const SITE = "https://www.clueso.io";
/** Captures of clueso.io live in public/tools/icon-lab/references. */
export const ASSET = "/tools/icon-lab/";

type S = ReturnType<typeof useIconLab.getState>;

/** The colour picked in the panel; the two theme defaults count as unpicked, so each spot keeps its own. */
export const pickedColour = (s: S) => (["#f5f3e7", "#111111"].includes(s.color.toLowerCase()) ? null : s.color);
const sizedOriginal = (name: string, size: number) => ORIGINAL_ICONS[name].svg.replace("<svg", `<svg width="${size}" height="${size}"`);

export function ContextPane() {
	const icon = useIconLab((s) => s.current);
	useIconLab((s) => s.rev);
	const s = useIconLab.getState();
	const openDialog = useIconLab((st) => st.openDialog);
	const sections = icon.pixel ? [<SiteSection key="site" s={s} icon={icon} />, <PixelWebSection key="pixel" s={s} icon={icon} />] : [<SiteSection key="site" s={s} icon={icon} />, <ProductSection key="product" s={s} icon={icon} />];
	const empty = !CONTEXT_DATA[icon.name] && (icon.pixel ? false : !ORIGINAL_ICONS[icon.name] && !icon.platform);

	return (
		<div className="il-icon my-auto flex w-full max-w-[640px] flex-col py-lg">
			{empty ? <p className="para-small text-weak">No context for this icon yet.</p> : sections}
			{/* clueso.design: the standalone app's In context dialog (URL, screenshot and sizes) had lost its
			    button when Context became a view. It opens from here now. */}
			<button type="button" onClick={() => openDialog("context")} className="label-xsmall self-start text-weak underline decoration-(--color-fg-stroke-normal) underline-offset-4 transition-colors hover:text-strong">
				Try it on a page or a screenshot
			</button>
		</div>
	);
}

/** Before and after on one surface: Now fills the frame, New sits on top to the right of a handle. */
export function Compare({ now, next }: { now: ReactNode; next: ReactNode }) {
	const x = useIconLab((s) => s.ctxX);
	const setCtxX = useIconLab((s) => s.setCtxX);
	const [dragging, setDragging] = useState(false);
	const handle = useRef<HTMLDivElement>(null);
	const at = (e: React.PointerEvent<HTMLDivElement>) => {
		const r = e.currentTarget.getBoundingClientRect();
		setCtxX(((e.clientX - r.left) / r.width) * 100);
	};
	return (
		<div
			className={cn("il-cmp", dragging && "il-dragging")}
			style={{ "--x": `${x}%` } as React.CSSProperties}
			onPointerDown={(e) => {
				// Otherwise the browser starts dragging the screenshot image and cancels the pointer.
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				setDragging(true);
				at(e);
				handle.current?.focus({ preventScroll: true });
			}}
			onPointerMove={(e) => dragging && at(e)}
			onPointerUp={() => setDragging(false)}
			onPointerCancel={() => setDragging(false)}
		>
			<div className="il-cmp-now">{now}</div>
			<div className="il-cmp-new" aria-hidden>
				{next}
			</div>
			<div
				ref={handle}
				className="il-cmp-handle"
				role="slider"
				tabIndex={0}
				aria-label="Compare now and new"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(x)}
				onKeyDown={(e) => {
					if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
					e.preventDefault();
					setCtxX(x + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 10 : 2));
				}}
			>
				<span />
			</div>
			<span className="il-cmp-tag il-cmp-tag-now">Now</span>
			<span className="il-cmp-tag il-cmp-tag-new">New</span>
		</div>
	);
}

/** A capture of clueso.io with each spot the icon is in patched with the new icon (after). */
export function Shot({ s, icon, after, mark = false, color }: { s: S; icon: Icon; after: boolean; mark?: boolean; color?: string }) {
	const d = CONTEXT_DATA[icon.name];
	const ink = color || pickedColour(s) || toHex(d.color);
	const bg = toHex(d.bg);
	const pct = (v: number, of: number) => `${(v / of) * 100}%`;
	const newIcon = sizedSvg(s, icon, Math.round(d.box.w), ink);
	// Every instance in the shot (a row of rating stars is replaced whole).
	const boxes = [d.box, ...(d.more || [])];
	return (
		<div className="il-shot">
			{/* A fixed capture at its own size; next/image adds nothing here. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={`${ASSET}${d.image}`} alt="" draggable={false} />
			{after &&
				boxes.map((b, i) => (
					<div
						key={i}
						className="il-patch"
						style={{ left: pct(b.x, d.size.w), top: pct(b.y, d.size.h), width: pct(b.w, d.size.w), height: pct(b.h, d.size.h), background: bg, boxShadow: `0 0 0 2px ${bg}` }}
						dangerouslySetInnerHTML={{ __html: newIcon }}
					/>
				))}
			{mark && <div className="il-mark" style={{ left: pct(d.box.x, d.size.w), top: pct(d.box.y, d.size.h), width: pct(d.box.w, d.size.w), height: pct(d.box.h, d.size.h) }} />}
		</div>
	);
}

// On clueso.io: the real spot, today's icon and ours over it. The page shows on hover, as a link.
function SiteSection({ s, icon }: { s: S; icon: Icon }) {
	const d = CONTEXT_DATA[icon.name];
	if (!d) return null;
	return (
		<section className="il-ctx-sec">
			<div className="il-ctx-shot">
				<Compare now={<Shot s={s} icon={icon} after={false} />} next={<Shot s={s} icon={icon} after />} />
			</div>
			<a className="il-ctx-label" href={`${SITE}${d.url}`} target="_blank" rel="noopener noreferrer">
				On clueso.io{d.url}
			</a>
		</section>
	);
}

function ProductMock({ icon, draw, dark }: { icon: Icon; draw: (size: number) => string; dark: boolean }) {
	const nm = pretty(icon.name);
	return (
		<div className={cn("il-mock", dark && "il-dark")}>
			<div className="il-mock-tb">
				<span className="il-mock-ib" dangerouslySetInnerHTML={{ __html: draw(20) }} />
				<span className="il-mock-lb">
					<span className="contents" dangerouslySetInnerHTML={{ __html: draw(16) }} />
					{nm}
				</span>
			</div>
			<div className="il-mock-mi">
				<span className="contents" dangerouslySetInnerHTML={{ __html: draw(16) }} />
				<span>{nm}</span>
			</div>
			<div className="il-mock-ramp" dangerouslySetInnerHTML={{ __html: [16, 20, 24, 32].map((sz) => draw(sz)).join("") }} />
		</div>
	);
}

// In the product: the same small app UI with today's library icon (Now) and ours (New), light and dark.
function ProductSection({ s, icon }: { s: S; icon: Icon }) {
	const original = ORIGINAL_ICONS[icon.name];
	if (!original && !icon.platform) return null;
	const ink = (dark: boolean) => (dark ? "#ececec" : "#1a1a1a");
	const ours = (dark: boolean) => (sz: number) => sizedSvg(s, icon, sz, pickedColour(s) || ink(dark));
	const now = (dark: boolean) => (sz: number) => (original ? `<span style="color:${ink(dark)}">${sizedOriginal(icon.name, sz)}</span>` : "");
	const where = icon.platform ? "In the Clueso platform (web.clueso.io)" : "In product UI";
	const label = `${where}${original ? ` · now: ${original.from} (Clueso icon library)` : ""}`;
	const one = (dark: boolean) =>
		original ? <Compare now={<ProductMock icon={icon} draw={now(dark)} dark={dark} />} next={<ProductMock icon={icon} draw={ours(dark)} dark={dark} />} /> : <ProductMock icon={icon} draw={ours(dark)} dark={dark} />;
	return (
		<section className="il-ctx-sec">
			<div className="grid grid-cols-2 gap-md">
				<div className="relative">
					{one(false)}
					<span className="il-ctx-tag">Light</span>
				</div>
				<div className="relative">
					{one(true)}
					<span className="il-ctx-tag il-dark">Dark</span>
				</div>
			</div>
			<span className="il-ctx-label">{label}</span>
		</section>
	);
}

// Pixel icons are a website-only direction, so their Context shows web uses at web sizes: feature
// cards (40 px in a tile), list rows (20 px), a full rating row for the star, and a size ramp.
function PixelWebSection({ s, icon }: { s: S; icon: Icon }) {
	const others = pixelIcons.filter((i) => i !== icon && !i.illustration).slice(0, 2);
	const blurbs = ["Scale up custom videos with the same effort.", "Your AI agent knows your brand guidelines.", "Build once, publish everywhere."];
	const block = (dark: boolean) => {
		const ink = pickedColour(s) || (dark ? "#F4F2EE" : "#141414");
		const tile = dark ? "#2a1428" : "#FCE7F9";
		const accent = pickedColour(s) || (dark ? "#FE89EB" : "#C12EAF");
		return (
			<div className={cn("il-pw", dark && "il-dark")}>
				<div className="il-pw-cards">
					{[icon, ...others].map((ic, i) => (
						<div key={ic.name} className="il-pw-card">
							<span className="il-pw-tile" style={{ background: tile }} dangerouslySetInnerHTML={{ __html: sizedSvg(s, ic, 40, accent) }} />
							<b>{pretty(ic.name)}</b>
							<span>{blurbs[i]}</span>
						</div>
					))}
				</div>
				{icon.name === "star" && (
					<div className="il-pw-rating">
						<b>4.8</b>
						<span className="contents" dangerouslySetInnerHTML={{ __html: Array.from({ length: 5 }, () => sizedSvg(s, icon, 20, "#F59E0B")).join("") }} />
						<span>out of 5 on G2</span>
					</div>
				)}
				<div className="il-pw-rows">
					{["Priority support", "Unlimited exports", "Custom branding"].map((t) => (
						<div key={t} className="il-pw-row">
							<Svg markup={sizedSvg(s, icon, 20, accent)} />
							<span>{t}</span>
						</div>
					))}
				</div>
				<div className="il-pw-ramp">
					{[16, 20, 24, 32, 48].map((sz) => (
						<figure key={sz}>
							<Svg markup={sizedSvg(s, icon, sz, ink)} />
							<figcaption>{sz}</figcaption>
						</figure>
					))}
				</div>
			</div>
		);
	};
	return (
		<section className="il-ctx-sec">
			{block(false)}
			<div className="mt-md">{block(true)}</div>
			<span className="il-ctx-label">On the website, at web sizes, light and dark (pixel is website only)</span>
		</section>
	);
}
