import type * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, type InputGroupSize, InputGroupText } from "@/lib/design-system/jigsaw/components/ui/controls/input-group/input-group";

/** jigsaw's text input: an InputGroup (inset surface, pink focus ring) with an optional unit suffix. */
function Field({ className, inputClassName, size = "xsmall", suffix, ...props }: Omit<React.ComponentProps<"input">, "size"> & { inputClassName?: string; size?: InputGroupSize; suffix?: React.ReactNode }) {
	return (
		<InputGroup size={size} className={className}>
			<InputGroupInput className={inputClassName} {...(props as React.ComponentProps<typeof InputGroupInput>)} />
			{suffix && (
				<InputGroupAddon align="inline-end">
					<InputGroupText>{suffix}</InputGroupText>
				</InputGroupAddon>
			)}
		</InputGroup>
	);
}

export { Field };
