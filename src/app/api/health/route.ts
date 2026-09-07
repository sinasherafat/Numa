import { apiData, livePrivatePathReady, providers } from "@/lib/domain";

export const runtime = "nodejs";

export async function GET() {
  return apiData({
    status: "ok",
    mode: livePrivatePathReady ? "live" : "demo",
    providers,
    sampleWorkspace: true,
    generatedAt: new Date().toISOString(),
  });
}
