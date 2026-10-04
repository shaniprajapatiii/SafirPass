import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { savePushSubscription, getAllPushSubscriptions } from "@/lib/db/postgres";

// Standard Web Push VAPID public key
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: PUBLIC_VAPID_KEY,
    supported: true,
  });
}

export async function POST(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;
    const userId = session?.id || "guest-tourist";

    const body = await request.json().catch(() => ({}));
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid push subscription object." },
        { status: 400 }
      );
    }

    const saved = await savePushSubscription({
      userId,
      subscription,
    });

    return NextResponse.json({
      success: true,
      message: "Push notifications active for critical safety advisories.",
      subscriptionKey: saved.key,
    });
  } catch (err) {
    console.error("[Push Subscription Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save push subscription." },
      { status: 500 }
    );
  }
}
