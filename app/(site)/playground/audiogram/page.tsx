import { ExperimentPage, experimentMetadata } from "@/components/playground/experiment-page";
import { Audiogram } from "@/components/playground/audiogram";

export const metadata = experimentMetadata("audiogram");

export default function Page() {
	return (
		<ExperimentPage slug="audiogram">
			<Audiogram />
		</ExperimentPage>
	);
}
