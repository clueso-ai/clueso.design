import type { Metadata, Viewport } from "next";
import { themeColors, themeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://clueso.design"),
	title: { default: "clueso.design", template: "%s · clueso.design" },
	description: "The Clueso design team's workshop. Tools, interaction experiments and the systems behind Clueso.",
	icons: { icon: "/mark.svg" },
	openGraph: { siteName: "clueso.design", type: "website" },
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: themeColors.light },
		{ media: "(prefers-color-scheme: dark)", color: themeColors.dark },
	],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-theme="lab" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
				<link rel="preload" href="/fonts/nohemi-variable.woff2" as="font" type="font/woff2" crossOrigin="" />
			</head>
			<body>
				{children}
			</body>
		</html>
	);
}
