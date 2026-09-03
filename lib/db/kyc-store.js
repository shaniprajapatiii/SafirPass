import {
  upsertProfile,
  upsertKycApplication,
  getKycApplicationByUserId,
  getAllKycApplications,
  updateKycStatus,
} from "./postgres.js";
import {
  saveDocumentVault,
  getDocumentVault,
  saveBiometricFaceLog,
  getBiometricFaceLog,
  updateDocumentStatuses,
  logAuthorityAction,
  getAuthorityAuditLogs,
} from "./mongodb.js";

/**
 * Unified KYC Application Submission Handler:
 * - Saves relational status & travel metadata into PostgreSQL
 * - Saves multi-document file scans into MongoDB Atlas (`DocumentVault`) via Mongoose & Cloudinary
 * - Saves biometric face snapshot & liveness metrics into MongoDB Atlas (`BiometricFaceLog`)
 */
export async function submitTouristKyc({
  userId,
  profile,
  documents,
  biometrics,
}) {
  const generatedId = `IN-TID-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Relational Record -> PostgreSQL
  const relationalKyc = {
    user_id: userId,
    full_name: profile.full_name,
    nationality: profile.nationality,
    passport_number: profile.passport_number,
    passport_expiry: profile.passport_expiry || null,
    visa_type: profile.visa_type || "",
    visa_number: profile.visa_number || "",
    entry_date: profile.entry_date || null,
    exit_date: profile.exit_date || null,
    emergency_contact: profile.emergency_contact || "",
    stay_address: profile.stay_address || "",
    blood_group: profile.blood_group || "",
    liveness_passed: Boolean(biometrics?.liveness_passed),
    liveness_score: Number(biometrics?.liveness_score || 0.98),
    status: "under_review", // 24-hour review pending state
    tourist_id: generatedId,
    device_seal_hash: `SEAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const savedRelational = await upsertKycApplication(relationalKyc);

  // 2. Profile Sync -> PostgreSQL
  if (profile.email || userId) {
    await upsertProfile({
      id: userId,
      email: profile.email || "",
      full_name: profile.full_name,
      nationality: profile.nationality,
      avatar_url: biometrics?.face_snapshot || null,
      updated_at: new Date().toISOString(),
    });
  }

  // 3. Document Vault Scans -> MongoDB Atlas via Mongoose & Cloudinary
  const documentPayload = {
    user_id: userId,
    tourist_id: generatedId,
    nationality: profile.nationality,
    documents: documents || {},
  };
  await saveDocumentVault(documentPayload);

  // 4. Biometric Face Telemetry & Liveness -> MongoDB Atlas
  const biometricPayload = {
    user_id: userId,
    tourist_id: generatedId,
    face_snapshot: biometrics?.face_snapshot || null,
    liveness_passed: Boolean(biometrics?.liveness_passed),
    liveness_score: Number(biometrics?.liveness_score || 0),
    captured_at: new Date().toISOString(),
  };
  await saveBiometricFaceLog(biometricPayload);

  return {
    success: true,
    kyc: savedRelational,
    message:
      "KYC application submitted successfully. Verification is under review (within 24 hours).",
  };
}

/**
 * Format document list for consistent frontend display
 */
function normalizeDocuments(vault) {
  if (!vault) return [];
  if (Array.isArray(vault.documents)) {
    return vault.documents;
  }
  if (typeof vault.documents === "object") {
    return Object.entries(vault.documents).map(([key, val]) => ({
      doc_type: key,
      file_name: val?.fileName || `${key}_document.jpg`,
      file_size: val?.fileSize || "Unknown",
      mime_type: val?.mimeType || "image/jpeg",
      url: val?.url || val?.secureUrl || val?.dataUrl,
      secure_url: val?.secureUrl || val?.url || val?.dataUrl,
      data_url: val?.dataUrl || val?.url,
      status: val?.status || "pending",
      failure_reason: val?.failureReason || "",
      uploaded_at: val?.uploadedAt || new Date(),
    }));
  }
  return [];
}

/**
 * Get unified KYC data for a tourist (combines PostgreSQL & MongoDB Atlas)
 */
export async function getUnifiedTouristKyc(userId) {
  const [relational, documents, biometrics] = await Promise.all([
    getKycApplicationByUserId(userId),
    getDocumentVault(userId),
    getBiometricFaceLog(userId),
  ]);

  if (!relational) return null;

  const docList = normalizeDocuments(documents);

  return {
    ...relational,
    documents: docList,
    document_summary: {
      total: docList.length,
      verified: docList.filter((d) => d.status === "verified").length,
      failed: docList.filter((d) => d.status === "failed").length,
      all_verified: docList.length > 0 && docList.every((d) => d.status === "verified"),
    },
    biometrics: {
      face_snapshot:
        biometrics?.face_snapshot_url ||
        biometrics?.face_snapshot_base64 ||
        null,
      liveness_score:
        biometrics?.liveness_score ?? relational.liveness_score ?? 0,
      liveness_passed:
        biometrics?.liveness_passed ?? relational.liveness_passed,
    },
  };
}

/**
 * Get all applications for the Authority Admin Portal with unified documents & biometrics
 */
export async function getAdminApplicationsQueue() {
  const relationalApps = await getAllKycApplications();

  const enrichedApps = await Promise.all(
    relationalApps.map(async (app) => {
      const [docs, bio] = await Promise.all([
        getDocumentVault(app.user_id),
        getBiometricFaceLog(app.user_id),
      ]);
      const docList = normalizeDocuments(docs);
      return {
        ...app,
        documents: docList,
        document_summary: {
          total: docList.length,
          verified: docList.filter((d) => d.status === "verified").length,
          failed: docList.filter((d) => d.status === "failed").length,
          all_verified: docList.length > 0 && docList.every((d) => d.status === "verified"),
        },
        biometrics: {
          face_snapshot:
            bio?.face_snapshot_url || bio?.face_snapshot_base64 || null,
          liveness_score: bio?.liveness_score ?? app.liveness_score ?? 0,
          liveness_passed: bio?.liveness_passed ?? app.liveness_passed,
        },
      };
    })
  );

  return enrichedApps;
}

/**
 * Admin action: Approve or Reject a tourist application with per-document granularity
 */
export async function processAdminKycDecision({
  userId,
  decision, // "verified" or "rejected"
  notes,
  adminEmail,
  documentDecisions = {},
  failedDocs = [],
}) {
  // 1. Update PostgreSQL status
  const updatedRelational = await updateKycStatus(
    userId,
    decision,
    notes,
    adminEmail
  );

  // 2. Update per-document statuses in MongoDB Atlas
  if (Object.keys(documentDecisions).length > 0) {
    await updateDocumentStatuses(userId, documentDecisions);
  }

  // 3. Log action in MongoDB Authority Audit Logs
  await logAuthorityAction({
    action: decision === "verified" ? "APPROVE_KYC" : "REJECT_KYC",
    targetUserId: userId,
    adminEmail: adminEmail,
    decision,
    notes:
      notes ||
      (decision === "verified"
        ? "Authority identity, documents and biometrics verified"
        : "Rejected by authority"),
    failedDocs: failedDocs,
    documentFeedback: Object.entries(documentDecisions).reduce(
      (acc, [k, v]) => {
        if (v.failureReason) acc[k] = v.failureReason;
        return acc;
      },
      {}
    ),
  });

  return {
    success: true,
    kyc: updatedRelational,
  };
}
