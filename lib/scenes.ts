// Scenes: the two default clips the Transition lab cuts between. A warm desert timelapse on the
// ground and a cool night pass from orbit, so every transition reads clearly. Both are public domain
// works of the US government (National Park Service and NASA) from Wikimedia Commons. Each file is a
// 5 s cut at 1280×720, 30 fps, H.264 with no audio, plus a poster JPG.
// Sources, licence links and edits: public/video/scenes/CREDITS.md

export type SceneClip = {
	id: string;
	title: string;
	src: string;
	poster: string;
	author: string;
	source: string;
	licence: string;
	seconds: number;
};

export const SCENES: SceneClip[] = [
	{
		id: "desert-sunset",
		title: "Desert sunset",
		src: "/video/scenes/desert-sunset.mp4",
		poster: "/video/scenes/desert-sunset.jpg",
		author: "Kristi Rugg, National Park Service",
		source: "https://commons.wikimedia.org/wiki/File:Timelapse_Joshua_Tree_Clouds_and_Sunset_Near_West_Entrance.webm",
		licence: "Public domain (PD-USGov-NPS)",
		seconds: 5,
	},
	{
		id: "night-orbit",
		title: "Night orbit",
		src: "/video/scenes/night-orbit.mp4",
		poster: "/video/scenes/night-orbit.jpg",
		author: "NASA, Jack Fischer on the ISS",
		source: "https://commons.wikimedia.org/wiki/File:Ocean_Moon_Glint_and_City_Night_Lights_in_4K.webm",
		licence: "Public domain (PD-USGov-NASA)",
		seconds: 5,
	},
];
