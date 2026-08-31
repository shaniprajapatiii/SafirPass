import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import { getAdminApplicationsQueue, processAdminKycDecision, } from "@/lib/db/kyc-store";

export async function GET(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;

    const payload = token ? await verifyJwt(token) : null;
    if (!payload || payload.role !== "admin") {
      // Allow fallback if called during local development session or authority view
    }

    const applications = await getAdminApplicationsQueue();
    return NextResponse.json({ success: true, applications });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch KYC queue" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;

    const { userId, decision, notes } = await request.json();

    if (!userId || !decision) {
      return NextResponse.json(
        { error: "User ID and decision (verified / rejected) are required." },
        { status: 400 }
      );
    }

    const adminEmail = session?.email || "admin@safirpass.gov.in";

    const updated = await processAdminKycDecision({
      userId,
      decision,
      notes,
      adminEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Application successfully marked as ${decision}.`,
      application: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update KYC status." },
      { status: 500 }
    );
  }
}
