import * as React from "react";

type GifTimelineScrollbarProps = {
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	contentContainerRef: React.RefObject<HTMLDivElement | null>;
	timelineSliderValue: number;
	setTimelineSliderValue: (value: number) => void;
	playheadRef?: React.RefObject<HTMLDivElement | null>;
	setIsZooming?: (isZooming: boolean) => void;
	/** Highest zoom value the handles can reach (default 100) */
	maxZoom?: number;
};

const MIN_ZOOM = 0;
const MAX_ZOOM = 100;

const getTimeStampGap = (alpha: number): number =>
	0.0077 * alpha * alpha + 0.2583 * alpha + 10.7451;

const getZoomFromTimeStampGap = (
	targetGap: number,
	maxZoom: number = MAX_ZOOM,
): number => {
	const a = 0.0077;
	const b = 0.2583;
	const c = 10.7451 - targetGap;
	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) return targetGap > 10.7451 ? maxZoom : MIN_ZOOM;
	const alpha = (-b + Math.sqrt(discriminant)) / (2 * a);
	return Math.max(MIN_ZOOM, Math.min(maxZoom, alpha));
};

let cursorStyleElement: HTMLStyleElement | null = null;
const lockCursor = (cursor: string) => {
	if (!cursorStyleElement) {
		cursorStyleElement = document.createElement("style");
		cursorStyleElement.id = "gif-scrollbar-cursor-lock";
		document.head.appendChild(cursorStyleElement);
	}
	cursorStyleElement.textContent = `* { cursor: ${cursor} !important; }`;
};
const unlockCursor = () => {
	cursorStyleElement?.remove();
	cursorStyleElement = null;
};

export const GifTimelineScrollbar: React.FC<GifTimelineScrollbarProps> = ({
	scrollContainerRef,
	contentContainerRef,
	timelineSliderValue,
	setTimelineSliderValue,
	setIsZooming,
	maxZoom = MAX_ZOOM,
}) => {
	const scrollbarRef = React.useRef<HTMLDivElement>(null);
	const thumbRef = React.useRef<HTMLDivElement>(null);
	const isDraggingRef = React.useRef<"thumb" | "left" | "right" | null>(null);
	const dragStartRef = React.useRef({
		viewportStartTime: 0,
		viewportEndTime: 0,
		mouseX: 0,
		scrollbarWidth: 0,
		totalDuration: 0,
		clientWidth: 0,
	});
	const pendingScrollRef = React.useRef<{ scrollLeft: number } | null>(null);
	const timelineSliderValueRef = React.useRef(timelineSliderValue);

	const [isDragging, setIsDragging] = React.useState(false);
	const [thumbDimensions, setThumbDimensions] = React.useState({
		thumbLeft: 0,
		thumbWidth: 0,
	});

	const getViewportInTime = React.useCallback(() => {
		const scrollContainer = scrollContainerRef.current;
		const contentContainer = contentContainerRef.current;
		if (!scrollContainer || !contentContainer)
			return {
				startTime: 0,
				endTime: 1,
				totalDuration: 1,
				clientWidth: 0,
			};
		const timeStampGap = getTimeStampGap(timelineSliderValue);
		const scrollLeft = scrollContainer.scrollLeft;
		const clientWidth = scrollContainer.clientWidth;
		const scrollWidth = contentContainer.scrollWidth;
		return {
			startTime: scrollLeft / timeStampGap,
			endTime: (scrollLeft + clientWidth) / timeStampGap,
			totalDuration: scrollWidth / timeStampGap,
			clientWidth,
		};
	}, [scrollContainerRef, contentContainerRef, timelineSliderValue]);

	const calculateThumbDimensions = React.useCallback(() => {
		const scrollContainer = scrollContainerRef.current;
		const contentContainer = contentContainerRef.current;
		const scrollbar = scrollbarRef.current;
		if (!scrollContainer || !contentContainer || !scrollbar)
			return { thumbLeft: 0, thumbWidth: 0 };
		const scrollWidth = contentContainer.scrollWidth;
		const clientWidth = scrollContainer.clientWidth;
		const scrollLeft = scrollContainer.scrollLeft;
		const scrollbarWidth = scrollbar.clientWidth;
		const viewportRatio = clientWidth / scrollWidth;
		const thumbWidth = Math.max(20, viewportRatio * scrollbarWidth);
		const maxScroll = scrollWidth - clientWidth;
		const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;
		const thumbLeft = scrollRatio * (scrollbarWidth - thumbWidth);
		return {
			thumbLeft: Math.max(
				0,
				Math.min(thumbLeft, scrollbarWidth - thumbWidth),
			),
			thumbWidth: Math.min(thumbWidth, scrollbarWidth),
		};
	}, [scrollContainerRef, contentContainerRef]);

	const updateThumbDOM = React.useCallback((left: number, width: number) => {
		if (thumbRef.current) {
			thumbRef.current.style.left = `${left}px`;
			thumbRef.current.style.width = `${width}px`;
		}
	}, []);

	const syncThumbState = React.useCallback(() => {
		const dims = calculateThumbDimensions();
		setThumbDimensions(dims);
		updateThumbDOM(dims.thumbLeft, dims.thumbWidth);
	}, [calculateThumbDimensions, updateThumbDOM]);

	React.useEffect(() => {
		if (timelineSliderValueRef.current !== timelineSliderValue) {
			timelineSliderValueRef.current = timelineSliderValue;
			if (pendingScrollRef.current && scrollContainerRef.current) {
				scrollContainerRef.current.scrollLeft =
					pendingScrollRef.current.scrollLeft;
				pendingScrollRef.current = null;
				syncThumbState();
			}
		}
	}, [timelineSliderValue, scrollContainerRef, syncThumbState]);

	React.useEffect(() => {
		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) return;
		syncThumbState();
		const handleScroll = () => {
			if (
				isDraggingRef.current !== "left" &&
				isDraggingRef.current !== "right"
			) {
				syncThumbState();
			}
		};
		scrollContainer.addEventListener("scroll", handleScroll);
		const ro = new ResizeObserver(() => syncThumbState());
		ro.observe(scrollContainer);
		contentContainerRef.current && ro.observe(contentContainerRef.current);
		return () => {
			scrollContainer.removeEventListener("scroll", handleScroll);
			ro.disconnect();
		};
	}, [scrollContainerRef, contentContainerRef, syncThumbState]);

	React.useEffect(() => () => unlockCursor(), []);

	React.useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDraggingRef.current) return;
			const scrollContainer = scrollContainerRef.current;
			const contentContainer = contentContainerRef.current;
			const scrollbar = scrollbarRef.current;
			if (!scrollContainer || !contentContainer || !scrollbar) return;

			const {
				viewportStartTime,
				viewportEndTime,
				mouseX,
				scrollbarWidth,
				totalDuration,
				clientWidth,
			} = dragStartRef.current;
			const deltaX = e.clientX - mouseX;

			if (isDraggingRef.current === "thumb") {
				const scrollWidth = contentContainer.scrollWidth;
				const currentClientWidth = scrollContainer.clientWidth;
				const currentThumbWidth = thumbRef.current?.offsetWidth || 20;
				const scrollableRange = scrollbarWidth - currentThumbWidth;
				if (scrollableRange > 0) {
					const scrollRatio = deltaX / scrollableRange;
					const maxScroll = scrollWidth - currentClientWidth;
					const startScrollLeft =
						viewportStartTime *
						getTimeStampGap(timelineSliderValue);
					scrollContainer.scrollLeft = Math.max(
						0,
						Math.min(
							maxScroll,
							startScrollLeft + scrollRatio * maxScroll,
						),
					);
				}
			} else {
				const timePerPixel = totalDuration / scrollbarWidth;
				const timeDelta = deltaX * timePerPixel;
				const maxTimeStampGap = getTimeStampGap(maxZoom);
				const minViewportDurationAtMaxZoom =
					clientWidth / maxTimeStampGap;

				let newStartTime: number;
				let newEndTime: number;

				if (isDraggingRef.current === "left") {
					newEndTime = viewportEndTime;
					newStartTime = Math.max(
						0,
						Math.min(
							viewportStartTime + timeDelta,
							newEndTime - minViewportDurationAtMaxZoom,
						),
					);
					if (newEndTime - newStartTime > totalDuration)
						newStartTime = newEndTime - totalDuration;
				} else {
					newStartTime = viewportStartTime;
					newEndTime = Math.min(
						totalDuration,
						Math.max(
							viewportEndTime + timeDelta,
							newStartTime + minViewportDurationAtMaxZoom,
						),
					);
					if (newEndTime - newStartTime > totalDuration)
						newEndTime = newStartTime + totalDuration;
				}

				const requiredTimeStampGap =
					clientWidth / (newEndTime - newStartTime);
				const newZoom = getZoomFromTimeStampGap(
					requiredTimeStampGap,
					maxZoom,
				);
				const actualTimeStampGap = getTimeStampGap(newZoom);
				const targetScrollLeft =
					isDraggingRef.current === "left"
						? newEndTime * actualTimeStampGap - clientWidth
						: newStartTime * actualTimeStampGap;

				setTimelineSliderValue(newZoom);
				pendingScrollRef.current = {
					scrollLeft: Math.max(0, targetScrollLeft),
				};

				const theoreticalScrollWidth =
					totalDuration * actualTimeStampGap;
				const viewportRatio = clientWidth / theoreticalScrollWidth;
				const thumbWidth = Math.max(
					20,
					viewportRatio * scrollbar.clientWidth,
				);
				const maxTheoreticalScroll =
					theoreticalScrollWidth - clientWidth;
				const scrollRatioNew =
					maxTheoreticalScroll > 0
						? Math.max(0, targetScrollLeft) / maxTheoreticalScroll
						: 0;
				const thumbLeft =
					scrollRatioNew * (scrollbar.clientWidth - thumbWidth);
				updateThumbDOM(
					Math.max(
						0,
						Math.min(thumbLeft, scrollbar.clientWidth - thumbWidth),
					),
					Math.min(thumbWidth, scrollbar.clientWidth),
				);
			}
		};

		const handleMouseUp = () => {
			if (!isDraggingRef.current) return;
			const wasZooming =
				isDraggingRef.current === "left" ||
				isDraggingRef.current === "right";
			isDraggingRef.current = null;
			setIsDragging(false);
			unlockCursor();
			if (wasZooming) setIsZooming?.(false);
			requestAnimationFrame(() => syncThumbState());
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [
		scrollContainerRef,
		contentContainerRef,
		timelineSliderValue,
		setTimelineSliderValue,
		setIsZooming,
		syncThumbState,
		updateThumbDOM,
		maxZoom,
	]);

	const handleThumbMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const viewport = getViewportInTime();
		isDraggingRef.current = "thumb";
		dragStartRef.current = {
			viewportStartTime: viewport.startTime,
			viewportEndTime: viewport.endTime,
			mouseX: e.clientX,
			scrollbarWidth: scrollbarRef.current?.clientWidth || 0,
			totalDuration: viewport.totalDuration,
			clientWidth: viewport.clientWidth,
		};
		lockCursor("grabbing");
		setIsDragging(true);
	};

	const handleHandleMouseDown =
		(side: "left" | "right") => (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const viewport = getViewportInTime();
			isDraggingRef.current = side;
			dragStartRef.current = {
				viewportStartTime: viewport.startTime,
				viewportEndTime: viewport.endTime,
				mouseX: e.clientX,
				scrollbarWidth: scrollbarRef.current?.clientWidth || 0,
				totalDuration: viewport.totalDuration,
				clientWidth: viewport.clientWidth,
			};
			lockCursor("ew-resize");
			setIsDragging(true);
			setIsZooming?.(true);
		};

	return (
		<div
			ref={scrollbarRef}
			className={`absolute left-1 right-1 py-xs cursor-default z-1000 select-none bg-surface transition-[bottom,opacity] duration-300 ease-in-out ${
				isDragging
					? "bottom-0 opacity-100"
					: "-bottom-4 opacity-0 group-hover:bottom-0 group-hover:opacity-100"
			}`}
		>
			<div
				className="p-0.5 invisible pointer-events-none"
				aria-hidden="true"
			>
				<div className="size-1" />
			</div>
			<div
				ref={thumbRef}
				className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-default flex items-center justify-between p-0.5 min-w-5 bg-weak"
				style={{
					left: `${thumbDimensions.thumbLeft}px`,
					width: `${thumbDimensions.thumbWidth}px`,
				}}
				onMouseDown={handleThumbMouseDown}
			>
				<div
					className="size-1 rounded-full cursor-ew-resize shrink-0 bg-strong shadow-sm"
					onMouseDown={handleHandleMouseDown("left")}
				/>
				<div
					className="size-1 rounded-full cursor-ew-resize shrink-0 bg-strong shadow-sm"
					onMouseDown={handleHandleMouseDown("right")}
				/>
			</div>
		</div>
	);
};
