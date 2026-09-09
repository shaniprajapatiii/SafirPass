import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { getUnifiedTouristKyc } from "@/lib/db/kyc-store";

export async function GET(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId") || session?.id;

    if (!requestedUserId) {
      return NextResponse.json({ kyc: null });
    }

    const unifiedKyc = await getUnifiedTouristKyc(requestedUserId);

    return NextResponse.json({ success: true, kyc: unifiedKyc });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch KYC status." },
      { status: 500 }
    );
  }
}
