"use client";

import { useSyncExternalStore } from "react";

// How long ago a date was, in words: "Today", "Yesterday", "3 days ago", "Last week", "2 months ago".
// Null on the server, so a static page never freezes "Today" at build time. It reads the visitor's
// calendar day and checks again every minute in case midnight passes.

const subscribe = (fn: () => void) => {
	const t = window.setInterval(fn, 60_000);
	return () => window.clearInterval(t);
};
const today = () => new Date().toDateString();
const useToday = () => useSyncExternalStore(subscribe, today, () => null);

const words = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function daysAgo(iso: string, now: Date) {
	const [y, m, d] = iso.split("-").map(Number);
	const then = new Date(y, m - 1, d);
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((start.getTime() - then.getTime()) / 86_400_000);
	const months = (start.getFullYear() - then.getFullYear()) * 12 + start.getMonth() - then.getMonth() - (start.getDate() < then.getDate() ? 1 : 0);
	const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
		days < 7 ? [days, "day"] : months < 1 ? [Math.round(days / 7), "week"] : months < 12 ? [months, "month"] : [Math.floor(months / 12), "year"];
	const text = words.format(-Math.max(value, 0), unit);
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function DaysAgo({ date, className = "" }: { date: string; className?: string }) {
	const now = useToday();
	return <span className={className}>{now === null ? null : daysAgo(date, new Date(now))}</span>;
}
