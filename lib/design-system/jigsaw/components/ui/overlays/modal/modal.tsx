import { XIcon } from "@icons/icons";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../../../../lib/utils";
import { Button } from "../../controls/button/button";

/* ============================================================================
   SIZE VARIANTS
   ============================================================================ */

const modalContentVariants = cva(
	"bg-surface-elevated-1 border border-weak rounded-xl shadow-[0px_24px_24px_0px_rgba(0,0,0,0.06),0px_6px_13px_0px_rgba(0,0,0,0.07)] flex flex-col fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
	{
		variants: {
			size: {
				small: "w-[360px] max-w-[25vw]",
				medium: "w-[600px] max-w-[40vw]",
				large: "w-[1080px] max-w-[70vw]",
			},
		},
		defaultVariants: {
			size: "small",
		},
	},
);

type ModalSize = "small" | "medium" | "large";

/* ============================================================================
   ROOT
   ============================================================================ */

function Modal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="modal" {...props} />;
}

/* ============================================================================
   TRIGGER
   ============================================================================ */

function ModalTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="modal-trigger" {...props} />;
}

/* ============================================================================
   CLOSE
   ============================================================================ */

function ModalClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="modal-close" {...props} />;
}

/* ============================================================================
   OVERLAY
   ============================================================================ */

function ModalOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="modal-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-overlay bg-black/30 backdrop-blur-sm",
				className,
			)}
			{...props}
		/>
	);
}

/* ============================================================================
   CONTENT
   ============================================================================ */

function ModalContent({
	className,
	children,
	size = "small",
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
	VariantProps<typeof modalContentVariants> & {
		size?: ModalSize;
	}) {
	return (
		<DialogPrimitive.Portal>
			<ModalOverlay />
			<DialogPrimitive.Content
				data-slot="modal-content"
				className={cn(modalContentVariants({ size }), className)}
				{...props}
			>
				{children}
				{/* Inner shadow overlay matching Figma spec */}
				<div className="absolute inset-[-1px] pointer-events-none rounded-[inherit] shadow-[inset_0.5px_0.5px_1px_0px_var(--color-fg-stroke-normal)]" />
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

/* ============================================================================
   HEADER
   ============================================================================ */

function ModalHeader({
	className,
	children,
	showClose = true,
	...props
}: React.ComponentProps<"div"> & {
	showClose?: boolean;
}) {
	return (
		<div
			data-slot="modal-header"
			className={cn("flex items-start justify-between w-full", className)}
			{...props}
		>
			<div className="flex flex-col gap-xs flex-1 p-2xl">{children}</div>
			{showClose && (
				<div className="p-md shrink-0">
					<DialogPrimitive.Close asChild>
						<Button
							variant="outlined"
							sentiment="neutral"
							size="medium"
							iconOnly
							icon={<XIcon />}
							aria-label="Close"
						/>
					</DialogPrimitive.Close>
				</div>
			)}
		</div>
	);
}

/* ============================================================================
   TITLE
   ============================================================================ */

function ModalTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="modal-title"
			className={cn("label-large-strong text-strong", className)}
			{...props}
		/>
	);
}

/* ============================================================================
   DESCRIPTION
   ============================================================================ */

function ModalDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="modal-description"
			className={cn("para-small text-normal", className)}
			{...props}
		/>
	);
}

/* ============================================================================
   BODY
   ============================================================================ */

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="modal-body"
			className={cn(
				"flex flex-col gap-md overflow-auto px-xl pt-none pb-xl",
				className,
			)}
			{...props}
		/>
	);
}

/* ============================================================================
   FOOTER (ACTION BAR)
   Small: horizontal layout, right-aligned, buttons sized by content
   Medium/Large: horizontal layout, tertiary on left, secondary + primary on right
   ============================================================================ */

function ModalFooter({
	className,
	size = "medium",
	...props
}: React.ComponentProps<"div"> & {
	size?: ModalSize;
}) {
	return (
		<div
			data-slot="modal-footer"
			className={cn(
				"px-xl pb-xl flex items-center w-full",
				size === "small" ? "justify-end gap-md" : "justify-between",
				className,
			)}
			{...props}
		/>
	);
}

/* ============================================================================
   FOOTER LEFT (for tertiary actions — Medium/Large only)
   ============================================================================ */

function ModalFooterLeft({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="modal-footer-left"
			className={cn("flex gap-md items-center", className)}
			{...props}
		/>
	);
}

/* ============================================================================
   FOOTER RIGHT (for primary + secondary actions — Medium/Large only)
   ============================================================================ */

function ModalFooterRight({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="modal-footer-right"
			className={cn("flex gap-md items-center ml-auto", className)}
			{...props}
		/>
	);
}

export {
	Modal,
	ModalTrigger,
	ModalClose,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalTitle,
	ModalDescription,
	ModalBody,
	ModalFooter,
	ModalFooterLeft,
	ModalFooterRight,
};

export type { ModalSize };
