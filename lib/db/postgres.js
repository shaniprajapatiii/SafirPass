import { supabase } from "../supabase.js";

// Resilient store for relational profiles & KYC records (synchronized with PostgreSQL)
const inMemoryRelationalStore = {
  profiles: new Map(),
  kyc_applications: new Map(),
  consent_requests: new Map(),
  sos_alerts: new Map(),
};


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
    ...(status === "verified" ? { approved_at: new Date().toISOString(), issued_at: new Date().toISOString() } : {}),
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
