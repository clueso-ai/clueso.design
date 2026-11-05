import type { Doc } from "../state/doc";

// Presets saved as files. To add one: make it in Brand Lab, choose "Share as preset" in the project
// menu, put the downloaded file in this folder and list it below. `pnpm check` fails if a file here
// isn't listed or isn't a valid preset. See README.md.

export interface PresetFile {
	version: 2;
	name: string;
	/** Which section of Library → Presets it appears in. */
	group: "Posters" | "Illustrations" | "Patterns";
	/** One canvas: the preset. */
	canvases: [Doc];
	active: 0;
}

import p85OnBrand from "./85-on-brand.brandlab.json";
import blushOrbit from "./blush-orbit.brandlab.json";
import eightyOnePieces from "./eighty-one-pieces.brandlab.json";
import glyphForms from "./glyph-forms.brandlab.json";
import madeOfPieces from "./made-of-pieces.brandlab.json";
import rotatingLogos from "./rotating-logos.brandlab.json";
import ultravioletRays from "./ultraviolet-rays.brandlab.json";

export const FILE_PRESETS: { id: string; file: PresetFile }[] = [
	{ id: "85-on-brand", file: p85OnBrand as unknown as PresetFile },
	{ id: "blush-orbit", file: blushOrbit as unknown as PresetFile },
	{ id: "eighty-one-pieces", file: eightyOnePieces as unknown as PresetFile },
	{ id: "glyph-forms", file: glyphForms as unknown as PresetFile },
	{ id: "made-of-pieces", file: madeOfPieces as unknown as PresetFile },
	{ id: "rotating-logos", file: rotatingLogos as unknown as PresetFile },
	{ id: "ultraviolet-rays", file: ultravioletRays as unknown as PresetFile },
];
