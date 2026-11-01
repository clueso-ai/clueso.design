// Default SVG import returns a URL string
declare module "*.svg" {
	const content: string;
	export default content;
}

// SVG imported with ?react suffix returns a React component
declare module "*.svg?react" {
	import type React from "react";
	const ReactComponent: React.FunctionComponent<
		React.SVGProps<SVGSVGElement> & { title?: string }
	>;
	export default ReactComponent;
}

// SVG imported with ?url suffix returns a URL string
declare module "*.svg?url" {
	const content: string;
	export default content;
}

// SVG imported with ?raw suffix returns raw SVG content as string
declare module "*.svg?raw" {
	const content: string;
	export default content;
}
