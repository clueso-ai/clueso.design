import { XIcon } from "@icons/icons";
import { ICON_NORMAL } from "../components/icon-button";
import type { ReactNode } from "react";
import { Button } from "@/lib/design-system/jigsaw/components/ui/controls/button/button";
import { Modal, ModalClose, ModalContent, ModalDescription, ModalTitle } from "@/lib/design-system/jigsaw/components/ui/overlays/modal/modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/lib/design-system/jigsaw/components/ui/overlays/tooltip/tooltip";

/** Large jigsaw modal over the editor: a header row (title, controls, close) and a scrolling body. Esc closes. */
export function Sheet({ title, controls, onClose, children, label }: { title: ReactNode; controls?: ReactNode; onClose: () => void; children: ReactNode; label: string }) {
	return (
		<Modal open onOpenChange={(o) => !o && onClose()}>
			<ModalContent size="large" aria-label={label} className="h-[calc(100vh-64px)] w-[min(1240px,calc(100vw-64px))] max-w-[none] overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
				<header className="flex shrink-0 items-center gap-md border-b border-weak py-lg pl-2xl pr-lg">
					<ModalTitle className="flex-1">{title}</ModalTitle>
					<ModalDescription className="sr-only">{label}</ModalDescription>
					<div className="flex items-center gap-md">{controls}</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<ModalClose asChild>
								<Button iconClassName={ICON_NORMAL} variant="transparent" sentiment="neutral" size="small" iconOnly icon={<XIcon />} aria-label="Close" />
							</ModalClose>
						</TooltipTrigger>
						<TooltipContent shortcut={["Esc"]}>Close</TooltipContent>
					</Tooltip>
				</header>
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2xl pt-xl pb-4xl">{children}</div>
			</ModalContent>
		</Modal>
	);
}

/** Hint line under a sheet header. */
export function SheetHint({ children }: { children: ReactNode }) {
	return <p className="para-small mb-xl text-normal">{children}</p>;
}

/** Centered empty state for a sheet body. */
export function SheetEmpty({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="mx-auto flex max-w-[380px] flex-col items-center gap-sm py-10xl text-center">
			<h3 className="label-medium-strong text-strong">{title}</h3>
			<p className="para-small text-normal">{children}</p>
		</div>
	);
}
