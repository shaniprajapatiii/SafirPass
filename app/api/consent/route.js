import { NextResponse } from "next/server";
import {
  createConsentRequest,
  getConsentRequestsByUserId,
  updateConsentRequestStatus,
  getConsentRequestById,
  getKycApplicationByTouristId,
} from "@/lib/db/postgres";
import { getUnifiedTouristKyc } from "@/lib/db/kyc-store";
import { getSession } from "@/lib/jwt";
import { toValidUuid } from "@/lib/uuid";
import { verifyDynamicQrToken } from "@/lib/qr-crypto";
import { attributeValue } from "@/lib/credential";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("id");

    // 1. If checking specific consent request (used by Service Terminal polling)
    if (consentId) {
      const consent = await getConsentRequestById(consentId);
      if (!consent) {
        return NextResponse.json(
          { error: "Consent request not found." },
          { status: 404 }
        );
      }

      let touristDetails = null;

      // If approved, attach the authorized disclosed attributes from KYC
      if (consent.status === "approved") {
        const kyc = await getUnifiedTouristKyc(consent.user_id);
        if (kyc) {
          const authorizedKeys =
            Array.isArray(consent.shared_attributes) && consent.shared_attributes.length > 0
              ? consent.shared_attributes
              : consent.attributes || [];

          touristDetails = {
            tourist_id: kyc.tourist_id,
            status: kyc.status,
          };

          authorizedKeys.forEach((key) => {
            touristDetails[key] = attributeValue(kyc, key);
          });

          // Special fields for Form C Hotel Compliance
          if (consent.requester_type === "hotel") {
            touristDetails.hotel_compliance = {
              form_c_eligible: true,
              reference: `FORM-C-${consent.id.slice(0, 8).toUpperCase()}`,
              issued_at: new Date().toISOString(),
              hotel_name: consent.requester,
            };
          }
        }
      }

      return NextResponse.json({
        success: true,
        request: consent,
        touristDetails,
      });
    }

    // 2. Otherwise, fetch all consent requests for the authenticated tourist
    const session = await getSession(request);
    if (!session?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const requests = await getConsentRequestsByUserId(session.id);
    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error("[Consent GET Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch consent requests" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let {
      tourist_id,
      token,
      requester = "Service Provider Desk",
      requester_type = "hotel",
      attributes = [],
      purpose = "Identity Verification",
    } = body;

    let targetUserId = null;
    let resolvedTouristId = tourist_id;

    // A) If token provided, verify token and extract touristId
    if (token) {
      const verified = await verifyDynamicQrToken(token);
      if (verified.valid && verified.payload?.tid) {
        resolvedTouristId = verified.payload.tid;
      }
    }

    // B) Resolve target user from tourist_id in database
    if (resolvedTouristId) {
      const kycRecord = await getKycApplicationByTouristId(resolvedTouristId);
      if (kycRecord) {
        targetUserId = kycRecord.user_id;
      }
    }

    // C) Fallback to session user if testing from dashboard
    if (!targetUserId) {
      const session = await getSession(request);
      if (session?.id) {
        targetUserId = session.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "Could not identify the tourist. Please ensure a valid Tourist ID or Dynamic QR is provided.",
        },
        { status: 400 }
      );
    }

    // Default required attributes by service provider type
    if (!attributes || attributes.length === 0) {
      if (requester_type === "hotel") {
        attributes = ["full_name", "nationality", "passport_number", "visa", "validity"];
      } else if (requester_type === "telecom") {
        attributes = ["full_name", "nationality", "passport_number", "visa"];
      } else if (requester_type === "rental") {
        attributes = ["full_name", "nationality", "emergency_contact", "validity"];
      } else {
        attributes = ["full_name", "nationality", "validity"];
      }
    }

    const consent = await createConsentRequest({
      user_id: targetUserId,
      requester: requester.trim(),
      requester_type,
      attributes,
      shared_attributes: [],
      status: "pending",
      purpose,
    });

    return NextResponse.json({
      success: true,
      consentId: consent.id,
      request: consent,
      touristId: resolvedTouristId,
      message: `Consent request transmitted to tourist's device for ${requester}.`,
    });
  } catch (err) {
    console.error("[Consent POST Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create consent request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getSession(request);
    if (!session?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to decide consent requests." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, shared_attributes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status ('approved' or 'denied') are required." },
        { status: 400 }
      );
    }

    const consent = await getConsentRequestById(id);
    if (!consent) {
      return NextResponse.json(
        { error: "Consent request not found." },
        { status: 404 }
      );
    }

    // Verify ownership: only the target tourist or an admin can approve/deny
    const userId = toValidUuid(session.id);
    if (consent.user_id !== userId && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to decide this consent request." },
        { status: 403 }
      );
    }

    const finalSharedAttributes =
      status === "approved"
        ? (Array.isArray(shared_attributes) && shared_attributes.length > 0
            ? shared_attributes
            : consent.attributes)
        : [];

    const updated = await updateConsentRequestStatus(id, status, finalSharedAttributes);

    return NextResponse.json({
      success: true,
      request: updated,
      message: `Consent request ${status} successfully.`,
    });
  } catch (err) {
    console.error("[Consent PATCH Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update consent status." },
      { status: 500 }
    );
  }
}
