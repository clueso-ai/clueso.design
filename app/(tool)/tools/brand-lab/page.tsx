import type { Metadata } from "next";
import { getItem } from "@/lib/registry";
import { BrandLabMount } from "./brand-lab-mount";

const item = getItem("brand-lab")!;

export const metadata: Metadata = {
	title: item.title,
	description: item.description,
};

export default function BrandLabPage() {
	return <BrandLabMount />;
}
