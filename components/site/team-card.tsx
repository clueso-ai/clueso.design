import Image from "next/image";
import type { Person } from "@/lib/team";

/** A team member: their looping portrait, name and title. Their cursor lives in TeamGrid. */
export function TeamCard({ person }: { person: Person }) {
	return (
		<li data-person={person.slug} className="flex flex-col">
			<div data-team-art={person.slug} className="relative aspect-square overflow-hidden bg-portrait">
				{/* The still shows for reduced motion, and until the video starts. */}
				{person.poster && <Image src={person.poster} alt="" fill sizes="(min-width: 768px) 20vw, 50vw" className="object-cover" />}
				{person.video && (
					<video
						src={person.video}
						poster={person.poster}
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						aria-label={`Portrait of ${person.name}`}
						className="relative size-full object-cover motion-reduce:hidden"
					/>
				)}
			</div>
			<div className="flex flex-col gap-gap-3xs border-t border-neutral-weak p-gap-m">
				<span className="type-title-s text-neutral-strong">{person.name}</span>
				<span className="type-text-s text-neutral-weak">{person.title}</span>
			</div>
		</li>
	);
}
