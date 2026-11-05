"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Shows its children on the homepage only, like the footer's playable logo. */
export function HomeOnly({ children }: { children: ReactNode }) {
	return usePathname() === "/" ? children : null;
}
