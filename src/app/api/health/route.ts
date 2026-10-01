import { apiData } from "@/lib/domain";

export const runtime = "nodejs";

export async function GET() {
  return apiData({
    status: "ok",
  });
}
