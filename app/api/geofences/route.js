import { NextResponse } from "next/server";
import { getAllGeofences } from "@/lib/db/postgres";

export async function GET() {
  try {
    const geofences = await getAllGeofences();
    return NextResponse.json({ success: true, geofences });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch geofences" },
      { status: 500 }
    );
  }
}
