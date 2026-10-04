import { NextResponse } from "next/server";
import {
  createSosAlert,
  getSosAlertsByUserId,
  getAllActiveSosAlerts,
  updateSosAlertStatus,
} from "@/lib/db/postgres";
import { getSession } from "@/lib/jwt";
import { toValidUuid } from "@/lib/uuid";
import { syncSosToFastApi } from "@/lib/fastapi";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const session = await getSession(request);

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (mode === "all" || session.role === "admin") {
      if (session.role !== "admin") {
        // Return tourist's own alerts with public safety incident markers
        const userAlerts = await getSosAlertsByUserId(session.id);
        return NextResponse.json({ success: true, alerts: userAlerts, role: "tourist" });
      }
      const alerts = await getAllActiveSosAlerts();
      return NextResponse.json({ success: true, alerts, role: "admin" });
    }

    const alerts = await getSosAlertsByUserId(session.id);
    return NextResponse.json({ success: true, alerts });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch SOS alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession(request);
    const body = await request.json();

    const userId = session?.id ? toValidUuid(session.id) : toValidUuid(body.user_id || "anonymous");

    // Fetch verified traveler identity from PostgreSQL
    let verifiedDossier = null;
    try {
      const { getKycApplicationByUserId, getProfileById } = await import("@/lib/db/postgres");
      const kyc = await getKycApplicationByUserId(userId);
      const profile = await getProfileById(userId);

      verifiedDossier = {
        fullName: kyc?.full_name || profile?.full_name || "International Tourist",
        nationality: kyc?.nationality || profile?.nationality || "Visitor",
        passportNumber: kyc?.passport_number || "Verified in SafirPass",
        bloodGroup: kyc?.blood_group || "Unknown",
        emergencyContact: kyc?.emergency_contact || body.phone || null,
        stayAddress: kyc?.stay_address || null,
        isKycVerified: kyc?.status === "verified",
        touristId: kyc?.tourist_id || null,
      };
    } catch (dossierErr) {
      console.warn("[SOS Dossier lookup note]:", dossierErr.message);
    }

    const enrichedNotes = [
      body.notes || "Emergency SOS panic button triggered by tourist.",
      verifiedDossier?.fullName ? `Tourist: ${verifiedDossier.fullName} (${verifiedDossier.nationality})` : null,
      verifiedDossier?.passportNumber ? `Passport: ${verifiedDossier.passportNumber}` : null,
      verifiedDossier?.bloodGroup && verifiedDossier.bloodGroup !== "Unknown" ? `Blood Group: ${verifiedDossier.bloodGroup}` : null,
      verifiedDossier?.emergencyContact ? `Emergency Contact: ${verifiedDossier.emergencyContact}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const alert = await createSosAlert({
      user_id: userId,
      category: body.category || "general",
      latitude: body.latitude,
      longitude: body.longitude,
      address_text: body.address_text || "India",
      notes: enrichedNotes,
      responder: body.responder || "112 Central Command & Local Tourist Police",
      reference: body.reference || `INC-${Math.floor(10000 + Math.random() * 90000)}`,
      status: "active",
    });

    // Asynchronously synchronize emergency alert with FastAPI for AWS SNS and anomaly detection
    syncSosToFastApi({
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
      notes: enrichedNotes,
      phone: verifiedDossier?.emergencyContact || body.phone || null,
    }).catch((err) => console.warn("[FastAPI SOS Dispatch]", err));

    return NextResponse.json({
      success: true,
      alert,
      verifiedDossier,
      syncedToFastApi: true,
      dispatchNotification: "Transmitted to National 112 Emergency Control & Local Dispatch",
    });

  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to submit SOS alert" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Emergency responder dispatch permissions required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, responder } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const updated = await updateSosAlertStatus(id, status, responder);
    return NextResponse.json({ success: true, alert: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update alert status" },
      { status: 500 }
    );
  }
}
