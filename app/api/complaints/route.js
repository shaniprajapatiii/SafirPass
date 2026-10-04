import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";
import {
  createComplaint,
  getComplaintsByUserId,
  getAllComplaints,
  updateComplaintStatus,
} from "@/lib/db/postgres";
import { getUnifiedTouristKyc } from "@/lib/db/kyc-store";
import { triageComplaintAi } from "@/lib/ai-safety";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;

    if (mode === "all") {
      const all = await getAllComplaints();
      return NextResponse.json({ success: true, complaints: all });
    }

    const userId = session?.id || "d4e5f6a7-b8c9-4d0e-bf23-456789abcdef";
    const userComplaints = await getComplaintsByUserId(userId);
    return NextResponse.json({ success: true, complaints: userComplaints });
  } catch (err) {
    console.error("[Get Complaints API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve complaints." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieHeader = request.cookies.get("safirpass_session");
    const token = cookieHeader?.value;
    const session = token ? await verifyJwt(token) : null;

    const body = await request.json().catch(() => ({}));
    const {
      category = "scam",
      vendorName = "",
      amount = "",
      currency = "INR",
      location = "",
      latitude = null,
      longitude = null,
      description = "",
      evidenceUrls = [],
    } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a detailed description (at least 10 characters)." },
        { status: 400 }
      );
    }

    const userId = session?.id || `anon-${Date.now()}`;
    let touristId = "IN-TID-TOURIST";
    let touristName = "International Tourist";

    if (session?.id) {
      const kyc = await getUnifiedTouristKyc(session.id);
      if (kyc) {
        touristId = kyc.tourist_id || touristId;
        touristName = kyc.full_name || touristName;
      }
    }

    // Run AI Grievance Triage with Gemini or expert police rules
    const aiTriage = await triageComplaintAi({
      category,
      description,
      amount,
      currency,
      location,
      vendorName,
    });

    const newRecord = await createComplaint({
      userId,
      touristId,
      touristName,
      category,
      vendorName,
      amount,
      currency,
      location,
      latitude,
      longitude,
      description,
      evidenceUrls,
      urgency: aiTriage?.urgency || "medium",
      aiTriage,
    });

    return NextResponse.json({
      success: true,
      message: "Complaint registered and routed to Tourist Police Grievance Cell.",
      complaint: newRecord,
    });
  } catch (err) {
    console.error("[Create Complaint API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit grievance." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, status, resolutionNotes, assignedOfficer } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Complaint ID and status are required." },
        { status: 400 }
      );
    }

    const updated = await updateComplaintStatus(id, {
      status,
      resolutionNotes,
      assignedOfficer,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Complaint not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Complaint status updated successfully.",
      complaint: updated,
    });
  } catch (err) {
    console.error("[Update Complaint API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update complaint status." },
      { status: 500 }
    );
  }
}
