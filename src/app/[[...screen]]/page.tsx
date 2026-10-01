import { NumaApp } from "@/components/numa-app";

export default async function ScreenPage({ params }: { params: Promise<{ screen?: string[] }> }) {
  const { screen = [] } = await params;
  return <NumaApp initialPath={`/${screen.join("/")}`.replace(/\/$/, "") || "/"} />;
}
