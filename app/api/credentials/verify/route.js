import { NextResponse } from "next/server";
import { verifyDynamicQrToken } from "@/lib/qr-crypto";
import { getKycApplicationByTouristId } from "@/lib/db/postgres";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || body.d || "";

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Missing verification token parameter." },
        { status: 400 }
      );
    }

    const verification = await verifyDynamicQrToken(token);

    if (!verification.valid) {
      return NextResponse.json({
        valid: false,
        expired: verification.expired || false,
        tampered: verification.tampered || false,
        error: verification.error || "Credential verification failed.",
        payload: verification.payload,
      });
    }

    const { payload, secondsRemaining, mode, verifiedAt } = verification;
    const touristId = payload.tid;

    // Cross-verify with PostgreSQL ground-truth authority database
    const dbKyc = await getKycApplicationByTouristId(touristId);

    if (dbKyc && dbKyc.status === "revoked") {
      return NextResponse.json({
        valid: false,
        revoked: true,
        error: "REVOKED CREDENTIAL: This tourist credential was officially revoked by national immigration authorities.",
        touristId,
      });
    }

    return NextResponse.json({
      valid: true,
      expired: false,
      tampered: false,
      touristId,
      status: dbKyc?.status || payload.status || "verified",
      issuer: payload.iss,
      mode,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      secondsRemaining,
      fields: payload.fields || [],
      verifiedAt,
      securityAudit: {
        algorithm: "HMAC-SHA256",
        nonce: payload.nonce,
        pkiIssuer: "Republic of India Immigration Authority",
        tamperEvident: true,
      },
    });
  } catch (err) {
    console.error("[Credential Verify Error]:", err);
    return NextResponse.json(
      { valid: false, error: err.message || "Failed to verify credential." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("d") || searchParams.get("token") || "";

  return POST(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
  );
}
