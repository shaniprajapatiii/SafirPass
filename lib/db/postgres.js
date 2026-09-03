import { supabase } from "../supabase.js";
import { toValidUuid } from "../uuid.js";

/**
 * Resilient in-memory fallback store for relational entities
 * Synchronized with PostgreSQL / Supabase
 */
const inMemoryRelationalStore = {
  profiles: new Map(),
  kyc_applications: new Map(),
  consent_requests: new Map(),
  sos_alerts: new Map(),
  geofences: new Map(),
};

function sanitizeDate(val) {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  // If it's a valid date string
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : val;
}

// -------------------------------------------------------------
// 1. PROFILES (Relational Table: `profiles`)
// -------------------------------------------------------------
export async function upsertProfile(profileData) {
  const sanitizedId = toValidUuid(profileData.id);
  const payload = {
    id: sanitizedId,
    full_name: profileData.full_name || "",
    email: profileData.email || "",
    nationality: profileData.nationality || "",
    phone: profileData.phone || "",
    avatar_url: profileData.avatar_url || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase profile upsert error:", error.message, error.details || "");
    } else if (data) {
      inMemoryRelationalStore.profiles.set(sanitizedId, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL profile upsert note:", err.message);
  }

  inMemoryRelationalStore.profiles.set(sanitizedId, payload);
  return payload;
}

export async function getProfileById(userId) {
  const sanitizedId = toValidUuid(userId);
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sanitizedId)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase profile get error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.profiles.set(sanitizedId, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL profile get note:", err.message);
  }

  return inMemoryRelationalStore.profiles.get(sanitizedId) || null;
}

// -------------------------------------------------------------
// 2. KYC APPLICATIONS (Relational Table: `kyc_applications`)
// -------------------------------------------------------------
export async function upsertKycApplication(kycData) {
  const sanitizedUserId = toValidUuid(kycData.user_id);
  const payload = {
    user_id: sanitizedUserId,
    full_name: kycData.full_name || "",
    nationality: kycData.nationality || "",
    passport_number: kycData.passport_number || "",
    passport_expiry: sanitizeDate(kycData.passport_expiry),
    visa_type: kycData.visa_type || "",
    visa_number: kycData.visa_number || "",
    entry_date: sanitizeDate(kycData.entry_date),
    exit_date: sanitizeDate(kycData.exit_date),
    emergency_contact: kycData.emergency_contact || "",
    stay_address: kycData.stay_address || "",
    blood_group: kycData.blood_group || "",
    liveness_passed: Boolean(kycData.liveness_passed),
    liveness_score: Number(kycData.liveness_score || 0.98),
    passport_doc_url: kycData.passport_doc_url || null,
    device_seal_hash: kycData.device_seal_hash || "",
    status: kycData.status || "under_review",
    tourist_id: kycData.tourist_id,
    admin_notes: kycData.admin_notes || "",
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .upsert(payload, { onConflict: "tourist_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase kyc upsert error:", error.message, error.details || "");
    } else if (data) {
      inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL kyc upsert note:", err.message);
  }

  inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, payload);
  return payload;
}

export async function getKycApplicationByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("user_id", sanitizedUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase kyc get error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL kyc get note:", err.message);
  }

  return inMemoryRelationalStore.kyc_applications.get(sanitizedUserId) || null;
}

export async function getAllKycApplications() {
  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase kyc list error:", error.message);
    } else if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL kyc list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.kyc_applications.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

export async function updateKycStatus(userId, status, notes = "", adminEmail = "") {
  const sanitizedUserId = toValidUuid(userId);
  const updatePayload = {
    status,
    admin_notes: notes,
    reviewed_by: adminEmail,
    reviewed_at: new Date().toISOString(),
    ...(status === "verified"
      ? { approved_at: new Date().toISOString(), issued_at: new Date().toISOString() }
      : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .update(updatePayload)
      .eq("user_id", sanitizedUserId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase kyc update status error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL kyc status update note:", err.message);
  }

  const existing = inMemoryRelationalStore.kyc_applications.get(sanitizedUserId);
  if (existing) {
    const updated = { ...existing, ...updatePayload };
    inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, updated);
    return updated;
  }

  return null;
}

// -------------------------------------------------------------
// 3. CONSENT REQUESTS (Relational Table: `consent_requests`)
// -------------------------------------------------------------
export async function createConsentRequest(consentData) {
  const sanitizedUserId = toValidUuid(consentData.user_id);
  const payload = {
    user_id: sanitizedUserId,
    requester: consentData.requester,
    requester_type: consentData.requester_type || "hotel",
    attributes: consentData.attributes || [],
    shared_attributes: consentData.shared_attributes || [],
    status: consentData.status || "pending",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("consent_requests")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase consent insert error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.consent_requests.set(data.id, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL consent insert note:", err.message);
  }

  const fallbackId = `req-${Date.now()}`;
  const fallback = { id: fallbackId, ...payload };
  inMemoryRelationalStore.consent_requests.set(fallbackId, fallback);
  return fallback;
}

export async function getConsentRequestsByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  try {
    const { data, error } = await supabase
      .from("consent_requests")
      .select("*")
      .eq("user_id", sanitizedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase consent list error:", error.message);
    } else if (data) {
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL consent list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.consent_requests.values())
    .filter((c) => c.user_id === sanitizedUserId || c.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function updateConsentRequestStatus(id, status, sharedAttributes = []) {
  const payload = {
    status,
    shared_attributes: sharedAttributes,
    decided_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("consent_requests")
      .update(payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase consent update error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.consent_requests.set(id, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL consent update note:", err.message);
  }

  const existing = inMemoryRelationalStore.consent_requests.get(id);
  if (existing) {
    const updated = { ...existing, ...payload };
    inMemoryRelationalStore.consent_requests.set(id, updated);
    return updated;
  }

  return null;
}

// -------------------------------------------------------------
// 4. EMERGENCY SOS ALERTS (Relational Table: `sos_alerts`)
// -------------------------------------------------------------
export async function createSosAlert(alertData) {
  const sanitizedUserId = toValidUuid(alertData.user_id);
  const payload = {
    user_id: sanitizedUserId,
    category: alertData.category || "general",
    latitude: alertData.latitude,
    longitude: alertData.longitude,
    address_text: alertData.address_text || "India",
    notes: alertData.notes || "",
    responder: alertData.responder || "112 Central Command",
    reference: alertData.reference || `INC-${Math.floor(10000 + Math.random() * 90000)}`,
    status: alertData.status || "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase SOS insert error:", error.message);
    } else if (data) {
      inMemoryRelationalStore.sos_alerts.set(data.id, data);
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL SOS insert note:", err.message);
  }

  const fallbackId = `sos-${Date.now()}`;
  const fallback = { id: fallbackId, ...payload };
  inMemoryRelationalStore.sos_alerts.set(fallbackId, fallback);
  return fallback;
}

export async function getSosAlertsByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", sanitizedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase SOS list error:", error.message);
    } else if (data) {
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL SOS list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values())
    .filter((s) => s.user_id === sanitizedUserId || s.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function getAllActiveSosAlerts() {
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase active SOS list error:", error.message);
    } else if (data) {
      return data;
    }
  } catch (err) {
    console.warn("PostgreSQL active SOS list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values())
    .filter((s) => s.status === "active")
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

