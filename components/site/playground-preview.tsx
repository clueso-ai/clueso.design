"use client";

import type { RegistryItem } from "@/lib/registry";
import { useFinePointer } from "@/lib/use-fine-pointer";

// A playground card's preview. Mouse-and-pen screens get the experiment itself, live and scaled
// down (styles/site.css). Phones and tablets get its still instead: running a whole experiment in
// a frame at four times the card's size is more than a phone's memory can take.

export function PlaygroundPreview({ item }: { item: RegistryItem }) {
	const fine = useFinePointer();
	return (
		<span className="playground-snippet relative block aspect-4/3 overflow-hidden border-b border-neutral-weak bg-sunken-1">
			{fine ? (
				// Lazy, out of the tab order, and it can't be clicked into: the card is the link.
				<iframe src={item.href} title={`${item.title} preview`} loading="lazy" tabIndex={-1} aria-hidden className="absolute top-0 left-0" />
			) : (
				item.preview && (
					// eslint-disable-next-line @next/next/no-img-element -- a fixed still; next/image adds nothing here
					<img src={item.preview} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
				)
			)}
		</span>
	);
}
