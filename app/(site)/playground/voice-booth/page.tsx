import { ExperimentPage, experimentMetadata } from "@/components/playground/experiment-page";
import { VoiceBooth } from "@/components/playground/voice-booth";

export const metadata = experimentMetadata("voice-booth");

export default function Page() {
	return (
		<ExperimentPage slug="voice-booth">
			<VoiceBooth />
		</ExperimentPage>
	);
}
