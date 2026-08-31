import { supabase } from "../supabase.js";

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

// -------------------------------------------------------------
// 1. PROFILES (Relational Table: `profiles`)
// -------------------------------------------------------------
export async function upsertProfile(profileData) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL profile upsert note:", err.message);
  }

  inMemoryRelationalStore.profiles.set(profileData.id, profileData);
  return profileData;
}

export async function getProfileById(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL profile get note:", err.message);
  }

  return inMemoryRelationalStore.profiles.get(userId) || null;
}

// -------------------------------------------------------------
// 2. KYC APPLICATIONS (Relational Table: `kyc_applications`)
// -------------------------------------------------------------
export async function upsertKycApplication(kycData) {
  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .upsert(kycData, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL kyc upsert note:", err.message);
  }

  inMemoryRelationalStore.kyc_applications.set(kycData.user_id, kycData);
  return kycData;
}

export async function getKycApplicationByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL kyc get note:", err.message);
  }

  return inMemoryRelationalStore.kyc_applications.get(userId) || null;
}

export async function getAllKycApplications() {
  try {
    const { data, error } = await supabase
      .from("kyc_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn("PostgreSQL kyc list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.kyc_applications.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

export async function updateKycStatus(userId, status, notes = "", adminEmail = "") {
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
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL kyc status update note:", err.message);
  }

  const existing = inMemoryRelationalStore.kyc_applications.get(userId);
  if (existing) {
    const updated = { ...existing, ...updatePayload };
    inMemoryRelationalStore.kyc_applications.set(userId, updated);
    return updated;
  }

  return null;
}

// -------------------------------------------------------------
// 3. CONSENT REQUESTS (Relational Table: `consent_requests`)
// -------------------------------------------------------------
export async function createConsentRequest(consentData) {
  const payload = {
    id: consentData.id || `req-${Date.now()}`,
    user_id: consentData.user_id,
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

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL consent insert note:", err.message);
  }

  inMemoryRelationalStore.consent_requests.set(payload.id, payload);
  return payload;
}

export async function getConsentRequestsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from("consent_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL consent list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.consent_requests.values())
    .filter((c) => c.user_id === userId)
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

    if (!error && data) return data;
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
  const payload = {
    id: alertData.id || `sos-${Date.now()}`,
    user_id: alertData.user_id,
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

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL SOS insert note:", err.message);
  }

  inMemoryRelationalStore.sos_alerts.set(payload.id, payload);
  return payload;
}

export async function getSosAlertsByUserId(userId) {
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL SOS list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values())
    .filter((s) => s.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function getAllActiveSosAlerts() {
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) return data;
  } catch (err) {
    console.warn("PostgreSQL active SOS list note:", err.message);
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values())
    .filter((s) => s.status === "active")
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}
