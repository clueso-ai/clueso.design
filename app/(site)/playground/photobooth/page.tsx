import { ExperimentPage, experimentMetadata } from "@/components/playground/experiment-page";
import { Photobooth } from "@/components/playground/photobooth";

export const metadata = experimentMetadata("photobooth");

export default function Page() {
	return (
		<ExperimentPage slug="photobooth">
			<Photobooth />
		</ExperimentPage>
	);
}
