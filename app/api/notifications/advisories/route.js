import { NextResponse } from "next/server";
import { createAdvisory, getAllAdvisories, getAllPushSubscriptions } from "@/lib/db/postgres";

export async function GET() {
  try {
    const advisories = await getAllAdvisories();
    return NextResponse.json({
      success: true,
      advisories,
      count: advisories.length,
    });
  } catch (err) {
    console.error("[Get Advisories Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load safety advisories." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      title,
      body: content,
      severity = "warning",
      location = "National",
      issuedBy = "National Tourist Safety Command",
      category = "safety",
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required for advisory broadcast." },
        { status: 400 }
      );
    }

    const advisory = await createAdvisory({
      title,
      body: content,
      severity,
      location,
      issuedBy,
      category,
    });

    const subscribers = await getAllPushSubscriptions();

    return NextResponse.json({
      success: true,
      message: `Advisory broadcasted to ${subscribers.length} connected tourist devices.`,
      advisory,
      broadcastCount: subscribers.length,
    });
  } catch (err) {
    console.error("[Broadcast Advisory Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to broadcast advisory." },
      { status: 500 }
    );
  }
}
