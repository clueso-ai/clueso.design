import type { Metadata } from "next";
import { getItem } from "@/lib/registry";
import { IconLabMount } from "./icon-lab-mount";

const item = getItem("icon-lab")!;

export const metadata: Metadata = {
	title: item.title,
	description: item.description,
	icons: { icon: "/tools/icon-lab/favicon.svg" },
};

export default function IconLabPage() {
	return <IconLabMount />;
}
