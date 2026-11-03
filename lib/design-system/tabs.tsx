"use client";

// Jigsaw's tabs use React context, and its snapshot file has no "use client". Re-exporting them
// from here keeps them on the client, so server pages can import the design system safely.
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./jigsaw/components/ui/controls/tabs/tabs";
