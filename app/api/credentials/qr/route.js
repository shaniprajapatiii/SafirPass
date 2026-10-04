import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { getUnifiedTouristKyc } from "@/lib/db/kyc-store";
import { signDynamicQrToken } from "@/lib/qr-crypto";
import { ATTRIBUTES, attributeValue } from "@/lib/credential";

export async function POST(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;

    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate dynamic credentials." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { keys = ["full_name", "nationality", "tourist_id", "validity"], isOffline = false } = body;

    const kyc = await getUnifiedTouristKyc(session.id);
    if (!kyc || !kyc.tourist_id) {
      return NextResponse.json(
        { error: "No KYC record found for this tourist account." },
        { status: 404 }
      );
    }

    // Build the requested disclosed attributes
    const activeKeys = Array.isArray(keys) && keys.length > 0 ? keys : ["full_name", "nationality", "tourist_id"];
    const fields = ATTRIBUTES
      .filter((a) => activeKeys.includes(a.key))
      .map((a) => ({
        key: a.key,
        label: a.label,
        value: attributeValue(kyc, a.key),
      }));

    // Dynamic QR has 45 seconds TTL (tight anti-replay/anti-screenshot).
    // Offline pass has 7 days TTL (for remote offline transit).
    const ttlSeconds = isOffline ? 7 * 86400 : 45;

    const signed = await signDynamicQrToken({
      touristId: kyc.tourist_id,
      userId: session.id,
      fields,
      status: kyc.status || "under_review",
      ttlSeconds,
      isOffline,
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const shareUrl = `${proto}://${host}/verify?d=${signed.token}`;

    return NextResponse.json({
      success: true,
      token: signed.token,
      expiresAt: signed.expiresAt,
      issuedAt: signed.issuedAt,
      ttlSeconds: signed.ttlSeconds,
      nonce: signed.nonce,
      mode: signed.mode,
      shareUrl,
      fields,
      touristId: kyc.tourist_id,
    });
  } catch (err) {
    console.error("[Dynamic QR Issuance Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to issue dynamic QR token." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  // Convenient fallback for simple GET polling
  return POST(request);
}
