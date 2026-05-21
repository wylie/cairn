import { NextResponse } from "next/server";
import { getPublicOccupancyPayload } from "@/lib/occupancy/public-occupancy";

export async function GET() {
  const payload = getPublicOccupancyPayload("org_summit", "loc_001");
  return NextResponse.json(payload);
}
