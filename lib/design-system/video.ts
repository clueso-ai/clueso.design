"use client";

// Jigsaw's video editing parts, vendored for the playground: the product's playhead, clips, timeline
// and its transport bar. Anything about a timeline or a player uses these (see jigsaw/SYNC.md).
export { Playhead, PLAYHEAD_GUTTER_WIDTHS, type PlayheadHeadShape, type PlayheadProps } from "./jigsaw/components/domain/video/playhead/playhead";
export { Clip, type ClipCategory, type ClipProps, type ClipSubType } from "./jigsaw/components/domain/video/clip/clip";
export {
	GIF_TIMELINE_MAX_ZOOM,
	GifTimeline,
	type GifTimelineClip,
	type GifTimelineFrame,
	type GifTimelineProps,
	GifTimelineTransport,
	type GifTimelineTransportProps,
	getTimeStampGap,
	getZoomFromTimeStampGap,
} from "./jigsaw/components/domain/video/gif-timeline/gif-timeline";
