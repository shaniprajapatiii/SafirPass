import {
  connectMongoose,
  DocumentVault,
  BiometricFaceLog,
  AuthorityAuditLog,
} from "./mongoose.js";
import { uploadToCloudinary } from "../cloudinary.js";

// In-Memory resilient fallback store if MongoDB Atlas network connection is temporarily unreachable
const inMemoryStore = {
  documents_vault: new Map(),
  biometric_face_logs: new Map(),
  authority_audit_logs: [],
};

// -------------------------------------------------------------
// Document Vault Operations (MongoDB Atlas Model: `DocumentVault`)
// -------------------------------------------------------------
export async function saveDocumentVault(docData) {
  const { user_id, tourist_id, nationality, documents = {} } = docData;

  // Process all documents with Cloudinary and normalize schema
  const docEntries = [];
  for (const [docKey, docVal] of Object.entries(documents)) {
    if (!docVal) continue;

    let secureUrl = docVal.url || docVal.dataUrl || "";
    let publicId = `doc_${user_id}_${docKey}`;
    let isCloudinary = Boolean(docVal.url && docVal.url.startsWith("http"));

    // Upload to Cloudinary if base64 dataUrl is provided
    if (docVal.dataUrl && typeof docVal.dataUrl === "string" && !isCloudinary) {
      try {
        const cloudUpload = await uploadToCloudinary(
          docVal.dataUrl,
          "safirpass/documents",
          publicId
        );
        if (cloudUpload?.secureUrl && cloudUpload.secureUrl.startsWith("http")) {
          secureUrl = cloudUpload.secureUrl;
          publicId = cloudUpload.publicId;
          isCloudinary = true;
        }
      } catch (err) {
        console.warn("Cloudinary upload note:", err.message);
      }
    }

    docEntries.push({
      doc_type: docKey,
      file_name: docVal.fileName || `${docKey}_scan.jpg`,
      file_size: docVal.fileSize || "Unknown",
      mime_type: docVal.mimeType || "image/jpeg",
      url: secureUrl,
      secure_url: secureUrl,
      public_id: publicId,
      // Only keep data_url if Cloudinary wasn't used to prevent duplicate memory explosion
      data_url: isCloudinary ? "" : docVal.dataUrl || secureUrl,
      status: docVal.status || "pending",
      failure_reason: docVal.failureReason || "",
      uploaded_at: docVal.uploadedAt ? new Date(docVal.uploadedAt) : new Date(),
    });
  }

  const recordPayload = {
    user_id,
    tourist_id,
    nationality: nationality || "International",
    documents: docEntries,
    uploaded_count: docEntries.length,
    verified_count: docEntries.filter((d) => d.status === "verified").length,
    failed_count: docEntries.filter((d) => d.status === "failed").length,
    all_verified: docEntries.length > 0 && docEntries.every((d) => d.status === "verified"),
    updated_at: new Date(),
  };

  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      const updated = await DocumentVault.findOneAndUpdate(
        { user_id },
        { $set: recordPayload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      if (updated) {
        console.log("✅ MongoDB DocumentVault saved for user:", user_id);
        inMemoryStore.documents_vault.set(user_id, updated);
        return updated;
      }
    }
  } catch (err) {
    console.error("❌ Mongoose DocumentVault save error:", err.message);
  }

  // Resilient memory cache
  inMemoryStore.documents_vault.set(user_id, recordPayload);
  return recordPayload;
}

export async function getDocumentVault(userId) {
  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      const doc = await DocumentVault.findOne({ user_id: userId }).lean();
      if (doc) return doc;
    }
  } catch (err) {
    console.error("❌ Mongoose DocumentVault get error:", err.message);
  }

  return inMemoryStore.documents_vault.get(userId) || null;
}

// -------------------------------------------------------------
// Biometric Face Log Operations (MongoDB Atlas Model: `BiometricFaceLog`)
// -------------------------------------------------------------
export async function saveBiometricFaceLog(bioData) {
  const {
    user_id,
    tourist_id,
    face_snapshot,
    liveness_passed,
    liveness_score,
  } = bioData;

  let faceUrl = face_snapshot || "";
  let publicId = `bio_${user_id}_face`;
  let isCloudinary = Boolean(faceUrl && faceUrl.startsWith("http"));

  // Upload face snapshot to Cloudinary if present
  if (face_snapshot && typeof face_snapshot === "string" && !isCloudinary) {
    try {
      const cloudUpload = await uploadToCloudinary(
        face_snapshot,
        "safirpass/biometrics",
        publicId
      );
      if (cloudUpload?.secureUrl && cloudUpload.secureUrl.startsWith("http")) {
        faceUrl = cloudUpload.secureUrl;
        isCloudinary = true;
      }
    } catch (err) {
      console.warn("Cloudinary biometric face upload note:", err.message);
    }
  }

  const recordPayload = {
    user_id,
    tourist_id,
    face_snapshot_url: faceUrl,
    // Only store snapshot base64 if not stored in Cloudinary
    face_snapshot_base64: isCloudinary ? "" : face_snapshot || "",
    liveness_passed: Boolean(liveness_passed),
    liveness_score: Number(liveness_score || 0),
    anti_spoof_confirmed: true,
    captured_at: new Date(),
  };

  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      const updated = await BiometricFaceLog.findOneAndUpdate(
        { user_id },
        { $set: recordPayload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      if (updated) {
        console.log("✅ MongoDB BiometricFaceLog saved for user:", user_id);
        inMemoryStore.biometric_face_logs.set(user_id, updated);
        return updated;
      }
    }
  } catch (err) {
    console.error("❌ Mongoose BiometricFaceLog save error:", err.message);
  }

  inMemoryStore.biometric_face_logs.set(user_id, recordPayload);
  return recordPayload;
}

export async function getBiometricFaceLog(userId) {
  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      const log = await BiometricFaceLog.findOne({ user_id: userId }).lean();
      if (log) return log;
    }
  } catch (err) {
    console.warn("Mongoose BiometricFaceLog get note:", err.message);
  }

  return inMemoryStore.biometric_face_logs.get(userId) || null;
}

// -------------------------------------------------------------
// Update Per-Document Verification Flags in MongoDB
// -------------------------------------------------------------
export async function updateDocumentStatuses(userId, documentDecisions = {}) {
  // documentDecisions: { [docType]: { status: 'verified' | 'failed', failureReason?: string } }
  try {
    const vault = await getDocumentVault(userId);
    if (vault && Array.isArray(vault.documents)) {
      const updatedDocs = vault.documents.map((d) => {
        const decision = documentDecisions[d.doc_type];
        if (decision) {
          return {
            ...d,
            status: decision.status,
            failure_reason: decision.failureReason || "",
            verified_at: decision.status === "verified" ? new Date() : null,
          };
        }
        return d;
      });

      const updatedVault = await saveDocumentVault({
        user_id: userId,
        tourist_id: vault.tourist_id,
        nationality: vault.nationality,
        documents: updatedDocs.reduce((acc, cur) => {
          acc[cur.doc_type] = cur;
          return acc;
        }, {}),
      });

      return updatedVault;
    }
  } catch (err) {
    console.warn("Update document statuses note:", err.message);
  }
  return null;
}

// -------------------------------------------------------------
// Authority Audit Trail Operations (MongoDB Atlas: `AuthorityAuditLog`)
// -------------------------------------------------------------
export async function logAuthorityAction({
  adminEmail,
  action,
  targetUserId,
  decision,
  notes,
  failedDocs = [],
  documentFeedback = {},
  metadata = {},
}) {
  const auditPayload = {
    admin_email: adminEmail,
    action,
    target_user_id: targetUserId,
    decision,
    admin_notes: notes,
    failed_documents: failedDocs,
    document_feedback: documentFeedback,
    metadata,
    timestamp: new Date(),
  };

  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      await AuthorityAuditLog.create(auditPayload);
    }
  } catch (err) {
    console.warn("Mongoose AuthorityAuditLog create note:", err.message);
  }

  inMemoryStore.authority_audit_logs.unshift(auditPayload);
  return auditPayload;
}

export async function getAuthorityAuditLogs(limit = 50) {
  try {
    const mongooseConn = await connectMongoose();
    if (mongooseConn) {
      const logs = await AuthorityAuditLog.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      if (logs && logs.length > 0) return logs;
    }
  } catch (err) {
    console.warn("Mongoose AuthorityAuditLog get note:", err.message);
  }

  return inMemoryStore.authority_audit_logs.slice(0, limit);
}
