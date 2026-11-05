import { ExperimentPage, experimentMetadata } from "@/components/playground/experiment-page";
import { Transitions } from "@/components/playground/transitions";

export const metadata = experimentMetadata("transitions");

export default function Page() {
	return (
		<ExperimentPage slug="transitions">
			<Transitions />
		</ExperimentPage>
	);
}
