import { useState } from "react";
import { BottomBar, IconButton, LeftPanel, PanelHeader, RightPanel, Section, ToolShell } from "@/tools/shell";

// A starting point for a new tool. Not routed: copy it into tools/<slug>/App.tsx and make it yours.

export function ExampleTool() {
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [toast, setToast] = useState<string | null>(null);

	const say = (text: string) => {
		setToast(text);
		window.setTimeout(() => setToast(null), 1600);
	};

	return (
		<ToolShell
			id="example"
			name="Example"
			theme={theme}
			toolbarEnd={<IconButton variant="outlined" label={theme === "light" ? "Dark interface" : "Light interface"} icon={<span aria-hidden>◐</span>} onClick={() => setTheme(theme === "light" ? "dark" : "light")} />}
			left={
				<LeftPanel aria-label="Things">
					<PanelHeader title="Things" />
				</LeftPanel>
			}
			right={
				<RightPanel aria-label="Settings">
					<Section title="Settings">
						<button type="button" className="label-small text-strong" onClick={() => say("Saved")}>
							Save
						</button>
					</Section>
				</RightPanel>
			}
			bottom={<BottomBar aria-label="Status" />}
			toast={toast}
		>
			{/* The canvas fills the window under the chrome. */}
			<div className="absolute inset-0 grid place-items-center text-weak">Your canvas</div>
		</ToolShell>
	);
}
