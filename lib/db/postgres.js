import { neon } from "@neondatabase/serverless";
import { toValidUuid } from "../uuid.js";

/* Neon Serverless Postgres Client Lazily initialized from DATABASE_URL */
function getSql() {
  const connectionString =
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) return null;
  return neon(connectionString);
}

/*Resilient in-memory fallback store for relational entities Keeps the application operational even before DATABASE_URL is configured
*/
const inMemoryRelationalStore = {
  profiles: new Map(),
  kyc_applications: new Map(),
  consent_requests: new Map(),
  sos_alerts: new Map(),
  geofences: new Map(),
  complaints: new Map(),
  push_subscriptions: new Map(),
  advisories: new Map(),
};

// Seed initial geofences into in-memory store
[
  {
    id: "g1-redfort",
    name: "Red Fort High Security Perimeter",
    category: "restricted",
    latitude: 28.6562,
    longitude: 77.241,
    radius_meters: 600,
    description: "High-security perimeter. Strict drone ban and bag checks in effect. Carry digital SafirPass ID.",
    safety_advisory: "Keep photo ID accessible. Unapproved photography of military installations is strictly prohibited.",
  },
  {
    id: "g2-tajganj",
    name: "Taj Ganj Scam Advisory Zone (Agra)",
    category: "scam_hotspot",
    latitude: 27.1751,
    longitude: 78.0421,
    radius_meters: 800,
    description: "Frequent unauthorized guides and fake ticket vendors reported claiming monument is closed.",
    safety_advisory: "Buy tickets ONLY at official ASI counters or asionline.asi.gov.in. Ignore claims of monument closure.",
  },
  {
    id: "g3-bagabeach",
    name: "Baga Beach Coastal Hazard Zone (Goa)",
    category: "hazard",
    latitude: 15.5524,
    longitude: 73.7517,
    radius_meters: 1000,
    description: "Strong rip currents and unpatrolled deep water stretches after sunset.",
    safety_advisory: "Avoid night swimming. Obey red flags posted by Drishti Marine Lifesavers. Dial 112 for coastal SOS.",
  },
  {
    id: "g4-paharganj",
    name: "Paharganj Fake Agency Zone (New Delhi)",
    category: "scam_hotspot",
    latitude: 28.6415,
    longitude: 77.2144,
    radius_meters: 750,
    description: "Known area for fake government tourist information centers and manipulated taxi meters.",
    safety_advisory: "Do not follow auto drivers claiming your hotel is closed. Use pre-paid booths or ride-hailing apps.",
  },
  {
    id: "g5-varanasi-ghats",
    name: "Dashashwamedh Ghat Riverfront Advisory (Varanasi)",
    category: "hazard",
    latitude: 25.3076,
    longitude: 83.0107,
    radius_meters: 900,
    description: "Extremely steep, slippery stone steps, dense evening Aarti crowds, and unlicensed boatmen.",
    safety_advisory: "Always wear life jackets on boats. Fix boat fares before boarding or book via official UP Tourism.",
  },
  {
    id: "g6-amerfort",
    name: "Amer Fort Transit & Touting Zone (Jaipur)",
    category: "scam_hotspot",
    latitude: 26.9855,
    longitude: 75.8513,
    radius_meters: 700,
    description: "Touting, overcharging for private jeep transfers, and aggressive souvenir hawkers.",
    safety_advisory: "Government RTDC audio guides and certified Rajasthan Tourism guides with official badges are available inside.",
  },
  {
    id: "g7-ladakh-border",
    name: "Pangong Tso Restricted ILP Border Zone (Ladakh)",
    category: "restricted",
    latitude: 33.7595,
    longitude: 78.6674,
    radius_meters: 3500,
    description: "Protected border territory. Requires valid Inner Line Permit (ILP) and passport registration at checkposts.",
    safety_advisory: "High altitude (14,270 ft). Acclimatize in Leh for 48 hours. Carry physical permit copies and SafirPass QR.",
  },
].forEach((g) => inMemoryRelationalStore.geofences.set(g.id, g));

function sanitizeDate(val) {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : val;
}

// 1. PROFILES (Relational Table: `profiles`)
let profileColumnsEnsured = false;
async function ensureProfileColumns(sql) {
  if (profileColumnsEnsured || !sql) return;
  try {
    await sql`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tourist';
    `;
    profileColumnsEnsured = true;
  } catch (err) {
    // Non-fatal if permissions don't allow ALTER TABLE; in-memory fallback handles it
    profileColumnsEnsured = true;
  }
}

export async function upsertProfile(profileData) {
  const sanitizedId = toValidUuid(profileData.id);
  const now = new Date().toISOString();
  const fullName = profileData.full_name || "";
  const email = profileData.email || "";
  const nationality = profileData.nationality || "";
  const phone = profileData.phone || "";
  const avatarUrl = profileData.avatar_url || null;
  const role = profileData.role || "tourist";
  const passwordHash = profileData.password_hash || null;

  const existingMem = inMemoryRelationalStore.profiles.get(sanitizedId);
  const payload = {
    id: sanitizedId,
    full_name: fullName || existingMem?.full_name || "",
    email: email || existingMem?.email || "",
    nationality: nationality || existingMem?.nationality || "",
    phone: phone || existingMem?.phone || "",
    avatar_url: avatarUrl || existingMem?.avatar_url || null,
    role: role || existingMem?.role || "tourist",
    password_hash: passwordHash || existingMem?.password_hash || null,
    updated_at: now,
  };

  const sql = getSql();
  if (sql) {
    try {
      await ensureProfileColumns(sql);
      const rows = await sql`
        INSERT INTO public.profiles (id, full_name, email, nationality, phone, avatar_url, role, password_hash, updated_at)
        VALUES (${sanitizedId}, ${payload.full_name}, ${payload.email}, ${payload.nationality}, ${payload.phone}, ${payload.avatar_url}, ${payload.role}, ${payload.password_hash}, ${now})
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          nationality = EXCLUDED.nationality,
          phone = EXCLUDED.phone,
          avatar_url = EXCLUDED.avatar_url,
          role = COALESCE(EXCLUDED.role, profiles.role),
          password_hash = COALESCE(EXCLUDED.password_hash, profiles.password_hash),
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.profiles.set(sanitizedId, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres profile upsert note:", err.message);
      // Fallback try without new columns if table schema is strictly locked
      try {
        const rows = await sql`
          INSERT INTO public.profiles (id, full_name, email, nationality, phone, avatar_url, updated_at)
          VALUES (${sanitizedId}, ${payload.full_name}, ${payload.email}, ${payload.nationality}, ${payload.phone}, ${payload.avatar_url}, ${now})
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            nationality = EXCLUDED.nationality,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        if (rows && rows.length > 0) {
          const merged = {
            ...rows[0],
            password_hash: payload.password_hash,
            role: payload.role,
          };
          inMemoryRelationalStore.profiles.set(sanitizedId, merged);
          return merged;
        }
      } catch (innerErr) {
        console.warn(
          "Neon Postgres basic profile upsert note:",
          innerErr.message,
        );
      }
    }
  }

  inMemoryRelationalStore.profiles.set(sanitizedId, payload);
  return payload;
}

export async function getProfileById(userId) {
  const sanitizedId = toValidUuid(userId);
  const sql = getSql();

  if (sql) {
    try {
      await ensureProfileColumns(sql);
      const rows = await sql`
        SELECT * FROM public.profiles WHERE id = ${sanitizedId} LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        const mem = inMemoryRelationalStore.profiles.get(sanitizedId);
        const merged = {
          ...rows[0],
          password_hash: rows[0].password_hash || mem?.password_hash || null,
          role: rows[0].role || mem?.role || "tourist",
        };
        inMemoryRelationalStore.profiles.set(sanitizedId, merged);
        return merged;
      }
    } catch (err) {
      console.warn("Neon Postgres profile get note:", err.message);
    }
  }

  return inMemoryRelationalStore.profiles.get(sanitizedId) || null;
}

export async function getProfileByEmail(email) {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  const sanitizedId = toValidUuid(trimmed);
  const sql = getSql();

  if (sql) {
    try {
      await ensureProfileColumns(sql);
      const rows = await sql`
        SELECT * FROM public.profiles WHERE LOWER(TRIM(email)) = ${trimmed} OR id = ${sanitizedId} LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        const mem =
          inMemoryRelationalStore.profiles.get(rows[0].id) ||
          inMemoryRelationalStore.profiles.get(sanitizedId);
        const merged = {
          ...rows[0],
          password_hash: rows[0].password_hash || mem?.password_hash || null,
          role: rows[0].role || mem?.role || "tourist",
        };
        inMemoryRelationalStore.profiles.set(rows[0].id, merged);
        return merged;
      }
    } catch (err) {
      console.warn("Neon Postgres profile getByEmail note:", err.message);
    }
  }

  for (const [, profile] of inMemoryRelationalStore.profiles.entries()) {
    if (profile?.email && profile.email.trim().toLowerCase() === trimmed) {
      return profile;
    }
  }
  return inMemoryRelationalStore.profiles.get(sanitizedId) || null;
}

// 2. KYC APPLICATIONS (Relational Table: `kyc_applications`)
export async function upsertKycApplication(kycData) {
  const sanitizedUserId = toValidUuid(kycData.user_id);
  const now = new Date().toISOString();
  const fullName = kycData.full_name || "";
  const nationality = kycData.nationality || "";
  const passportNumber = kycData.passport_number || "";
  const passportExpiry = sanitizeDate(kycData.passport_expiry);
  const visaType = kycData.visa_type || "";
  const visaNumber = kycData.visa_number || "";
  const entryDate = sanitizeDate(kycData.entry_date);
  const exitDate = sanitizeDate(kycData.exit_date);
  const emergencyContact = kycData.emergency_contact || "";
  const stayAddress = kycData.stay_address || "";
  const bloodGroup = kycData.blood_group || "";
  const livenessPassed = Boolean(kycData.liveness_passed);
  const livenessScore = Number(kycData.liveness_score || 0.98);
  const passportDocUrl = kycData.passport_doc_url || null;
  const deviceSealHash = kycData.device_seal_hash || "";
  const status = kycData.status || "under_review";
  const touristId = kycData.tourist_id;
  const adminNotes = kycData.admin_notes || "";

  const payload = {
    user_id: sanitizedUserId,
    full_name: fullName,
    nationality,
    passport_number: passportNumber,
    passport_expiry: passportExpiry,
    visa_type: visaType,
    visa_number: visaNumber,
    entry_date: entryDate,
    exit_date: exitDate,
    emergency_contact: emergencyContact,
    stay_address: stayAddress,
    blood_group: bloodGroup,
    liveness_passed: livenessPassed,
    liveness_score: livenessScore,
    passport_doc_url: passportDocUrl,
    device_seal_hash: deviceSealHash,
    status,
    tourist_id: touristId,
    admin_notes: adminNotes,
    updated_at: now,
  };

  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO public.kyc_applications (
          user_id, full_name, nationality, passport_number, passport_expiry,
          visa_type, visa_number, entry_date, exit_date, emergency_contact,
          stay_address, blood_group, liveness_passed, liveness_score,
          passport_doc_url, device_seal_hash, status, tourist_id, admin_notes, updated_at
        ) VALUES (
          ${sanitizedUserId}, ${fullName}, ${nationality}, ${passportNumber}, ${passportExpiry},
          ${visaType}, ${visaNumber}, ${entryDate}, ${exitDate}, ${emergencyContact},
          ${stayAddress}, ${bloodGroup}, ${livenessPassed}, ${livenessScore},
          ${passportDocUrl}, ${deviceSealHash}, ${status}, ${touristId}, ${adminNotes}, ${now}
        )
        ON CONFLICT (tourist_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          nationality = EXCLUDED.nationality,
          passport_number = EXCLUDED.passport_number,
          passport_expiry = EXCLUDED.passport_expiry,
          visa_type = EXCLUDED.visa_type,
          visa_number = EXCLUDED.visa_number,
          entry_date = EXCLUDED.entry_date,
          exit_date = EXCLUDED.exit_date,
          emergency_contact = EXCLUDED.emergency_contact,
          stay_address = EXCLUDED.stay_address,
          blood_group = EXCLUDED.blood_group,
          liveness_passed = EXCLUDED.liveness_passed,
          liveness_score = EXCLUDED.liveness_score,
          passport_doc_url = EXCLUDED.passport_doc_url,
          device_seal_hash = EXCLUDED.device_seal_hash,
          status = EXCLUDED.status,
          admin_notes = EXCLUDED.admin_notes,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres KYC upsert note:", err.message);
    }
  }

  inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, payload);
  return payload;
}

export async function getKycApplicationByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.kyc_applications
        WHERE user_id = ${sanitizedUserId}
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres KYC get note:", err.message);
    }
  }

  return inMemoryRelationalStore.kyc_applications.get(sanitizedUserId) || null;
}

export async function getKycApplicationByTouristId(touristId) {
  if (!touristId) return null;
  const trimmed = touristId.trim();
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.kyc_applications
        WHERE tourist_id = ${trimmed}
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres KYC get by touristId note:", err.message);
    }
  }

  for (const [, kyc] of inMemoryRelationalStore.kyc_applications.entries()) {
    if (kyc?.tourist_id === trimmed) {
      return kyc;
    }
  }
  return null;
}

export async function getAllKycApplications() {
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.kyc_applications
        ORDER BY created_at DESC;
      `;
      if (rows && rows.length > 0) {
        return rows;
      }
    } catch (err) {
      console.warn("Neon Postgres KYC list note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.kyc_applications.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
}

export async function updateKycStatus(
  userId,
  status,
  notes = "",
  adminEmail = "",
) {
  const sanitizedUserId = toValidUuid(userId);
  const now = new Date().toISOString();
  const isApproved = status === "verified";
  const approvedAt = isApproved ? now : null;
  const issuedAt = isApproved ? now : null;

  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        UPDATE public.kyc_applications
        SET
          status = ${status},
          admin_notes = ${notes},
          reviewed_by = ${adminEmail},
          reviewed_at = ${now},
          approved_at = COALESCE(${approvedAt}, approved_at),
          issued_at = COALESCE(${issuedAt}, issued_at),
          updated_at = ${now}
        WHERE user_id = ${sanitizedUserId}
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres KYC status update note:", err.message);
    }
  }

  const existing =
    inMemoryRelationalStore.kyc_applications.get(sanitizedUserId);
  if (existing) {
    const updated = {
      ...existing,
      status,
      admin_notes: notes,
      reviewed_by: adminEmail,
      reviewed_at: now,
      ...(isApproved ? { approved_at: now, issued_at: now } : {}),
      updated_at: now,
    };
    inMemoryRelationalStore.kyc_applications.set(sanitizedUserId, updated);
    return updated;
  }

  return null;
}

// 3. CONSENT REQUESTS (Relational Table: `consent_requests`)
export async function createConsentRequest(consentData) {
  const sanitizedUserId = toValidUuid(consentData.user_id);
  const requester = consentData.requester;
  const requesterType = consentData.requester_type || "hotel";
  const attributes = consentData.attributes || [];
  const sharedAttributes = consentData.shared_attributes || [];
  const status = consentData.status || "pending";
  const now = new Date().toISOString();

  const payload = {
    user_id: sanitizedUserId,
    requester,
    requester_type: requesterType,
    attributes,
    shared_attributes: sharedAttributes,
    status,
    created_at: now,
  };

  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO public.consent_requests (user_id, requester, requester_type, attributes, shared_attributes, status, created_at)
        VALUES (${sanitizedUserId}, ${requester}, ${requesterType}, ${attributes}, ${sharedAttributes}, ${status}, ${now})
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.consent_requests.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres consent insert note:", err.message);
    }
  }

  const fallbackId = `req-${Date.now()}`;
  const fallback = { id: fallbackId, ...payload };
  inMemoryRelationalStore.consent_requests.set(fallbackId, fallback);
  return fallback;
}

export async function getConsentRequestsByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.consent_requests
        WHERE user_id = ${sanitizedUserId}
        ORDER BY created_at DESC;
      `;
      if (rows) return rows;
    } catch (err) {
      console.warn("Neon Postgres consent list note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.consent_requests.values())
    .filter((c) => c.user_id === sanitizedUserId || c.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function updateConsentRequestStatus(
  id,
  status,
  sharedAttributes = [],
) {
  const now = new Date().toISOString();
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        UPDATE public.consent_requests
        SET
          status = ${status},
          shared_attributes = ${sharedAttributes},
          decided_at = ${now}
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.consent_requests.set(id, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres consent update note:", err.message);
    }
  }

  const existing = inMemoryRelationalStore.consent_requests.get(id);
  if (existing) {
    const updated = {
      ...existing,
      status,
      shared_attributes: sharedAttributes,
      decided_at: now,
    };
    inMemoryRelationalStore.consent_requests.set(id, updated);
    return updated;
  }

  return null;
}

export async function getConsentRequestById(id) {
  if (!id) return null;
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.consent_requests
        WHERE id = ${id}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres consent getById note:", err.message);
    }
  }

  return inMemoryRelationalStore.consent_requests.get(id) || null;
}

// 4. EMERGENCY SOS ALERTS (Relational Table: `sos_alerts`)
export async function createSosAlert(alertData) {
  const sanitizedUserId = toValidUuid(alertData.user_id);
  const category = alertData.category || "general";
  const latitude = alertData.latitude ?? null;
  const longitude = alertData.longitude ?? null;
  const addressText = alertData.address_text || "India";
  const notes = alertData.notes || "";
  const responder = alertData.responder || "112 Central Command";
  const reference =
    alertData.reference || `INC-${Math.floor(10000 + Math.random() * 90000)}`;
  const status = alertData.status || "active";
  const now = new Date().toISOString();

  const payload = {
    user_id: sanitizedUserId,
    category,
    latitude,
    longitude,
    address_text: addressText,
    notes,
    responder,
    reference,
    status,
    created_at: now,
    updated_at: now,
  };

  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO public.sos_alerts (user_id, category, latitude, longitude, address_text, notes, responder, reference, status, created_at, updated_at)
        VALUES (${sanitizedUserId}, ${category}, ${latitude}, ${longitude}, ${addressText}, ${notes}, ${responder}, ${reference}, ${status}, ${now}, ${now})
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.sos_alerts.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres SOS insert note:", err.message);
    }
  }

  const fallbackId = `sos-${Date.now()}`;
  const fallback = { id: fallbackId, ...payload };
  inMemoryRelationalStore.sos_alerts.set(fallbackId, fallback);
  return fallback;
}

export async function getSosAlertsByUserId(userId) {
  const sanitizedUserId = toValidUuid(userId);
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.sos_alerts
        WHERE user_id = ${sanitizedUserId}
        ORDER BY created_at DESC;
      `;
      if (rows) return rows;
    } catch (err) {
      console.warn("Neon Postgres SOS list note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values())
    .filter((s) => s.user_id === sanitizedUserId || s.user_id === userId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function getAllActiveSosAlerts() {
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.sos_alerts
        ORDER BY created_at DESC;
      `;
      if (rows) return rows;
    } catch (err) {
      console.warn("Neon Postgres active SOS list note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.sos_alerts.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
}

export async function updateSosAlertStatus(
  id,
  status,
  responder = "National 112 Control Unit",
) {
  const now = new Date().toISOString();
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        UPDATE public.sos_alerts
        SET
          status = ${status},
          responder = ${responder},
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.sos_alerts.set(id, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres SOS update note:", err.message);
    }
  }

  const existing = inMemoryRelationalStore.sos_alerts.get(id);
  if (existing) {
    const updated = { ...existing, status, responder, updated_at: now };
    inMemoryRelationalStore.sos_alerts.set(id, updated);
    return updated;
  }

  return null;
}

// 5. GEOFENCES (Relational Table: `geofences`)
export async function getAllGeofences() {
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.geofences
        ORDER BY created_at ASC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("Neon Postgres geofences note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.geofences.values());
}

// 6. TOURIST COMPLAINTS & GRIEVANCE DESK (Table: `tourist_complaints`)
export async function createComplaint({
  userId,
  touristId = "IN-TID-TOURIST",
  touristName = "International Tourist",
  category = "scam",
  vendorName = "",
  amount = "",
  currency = "INR",
  location = "",
  latitude = null,
  longitude = null,
  description = "",
  evidenceUrls = [],
  urgency = "medium",
  aiTriage = null,
}) {
  const now = new Date().toISOString();
  const id = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const trackingNumber = `GRV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const complaintRecord = {
    id,
    tracking_number: trackingNumber,
    user_id: userId,
    tourist_id: touristId,
    tourist_name: touristName,
    category,
    vendor_name: vendorName,
    amount,
    currency,
    location,
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    description,
    evidence_urls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
    urgency,
    status: "submitted", // submitted | under_investigation | action_taken | resolved | dismissed
    assigned_officer: null,
    resolution_notes: null,
    ai_triage: aiTriage,
    created_at: now,
    updated_at: now,
  };

  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO public.tourist_complaints (
          id, tracking_number, user_id, tourist_id, tourist_name, category,
          vendor_name, amount, currency, location, latitude, longitude,
          description, urgency, status, created_at, updated_at
        ) VALUES (
          ${id}, ${trackingNumber}, ${userId}, ${touristId}, ${touristName}, ${category},
          ${vendorName}, ${amount}, ${currency}, ${location}, ${complaintRecord.latitude}, ${complaintRecord.longitude},
          ${description}, ${urgency}, 'submitted', ${now}, ${now}
        )
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.complaints.set(id, { ...complaintRecord, ...rows[0] });
        return { ...complaintRecord, ...rows[0] };
      }
    } catch (err) {
      console.warn("Neon Postgres create complaint note:", err.message);
    }
  }

  inMemoryRelationalStore.complaints.set(id, complaintRecord);
  return complaintRecord;
}

export async function getComplaintsByUserId(userId) {
  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.tourist_complaints
        WHERE user_id = ${userId}
        ORDER BY created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("Neon Postgres get user complaints note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.complaints.values())
    .filter((c) => !userId || c.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getAllComplaints() {
  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM public.tourist_complaints
        ORDER BY created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.warn("Neon Postgres get all complaints note:", err.message);
    }
  }

  return Array.from(inMemoryRelationalStore.complaints.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export async function updateComplaintStatus(
  id,
  { status, resolutionNotes = null, assignedOfficer = null }
) {
  const now = new Date().toISOString();
  const sql = getSql();

  if (sql) {
    try {
      const rows = await sql`
        UPDATE public.tourist_complaints
        SET
          status = ${status},
          resolution_notes = ${resolutionNotes},
          assigned_officer = ${assignedOfficer},
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *;
      `;
      if (rows && rows.length > 0) {
        inMemoryRelationalStore.complaints.set(id, rows[0]);
        return rows[0];
      }
    } catch (err) {
      console.warn("Neon Postgres update complaint note:", err.message);
    }
  }

  const existing = inMemoryRelationalStore.complaints.get(id);
  if (existing) {
    const updated = {
      ...existing,
      status: status || existing.status,
      resolution_notes: resolutionNotes !== undefined ? resolutionNotes : existing.resolution_notes,
      assigned_officer: assignedOfficer !== undefined ? assignedOfficer : existing.assigned_officer,
      updated_at: now,
    };
    inMemoryRelationalStore.complaints.set(id, updated);
    return updated;
  }

  return null;
}

// 7. WEB PUSH SUBSCRIPTIONS & CRITICAL ADVISORIES
export async function savePushSubscription({ userId = "guest", subscription }) {
  const key = `${userId}-${subscription.endpoint?.slice(-20) || Date.now()}`;
  const record = {
    key,
    userId,
    subscription,
    savedAt: new Date().toISOString(),
  };
  inMemoryRelationalStore.push_subscriptions.set(key, record);
  return record;
}

export async function getAllPushSubscriptions() {
  return Array.from(inMemoryRelationalStore.push_subscriptions.values());
}

export async function createAdvisory({
  title,
  body,
  severity = "warning",
  location = "National",
  issuedBy = "National Tourist Safety Command",
  category = "safety",
}) {
  const id = `adv-${Date.now().toString(36)}`;
  const advisory = {
    id,
    title,
    body,
    severity,
    location,
    issuedBy,
    category,
    createdAt: new Date().toISOString(),
  };
  inMemoryRelationalStore.advisories.set(id, advisory);
  return advisory;
}

export async function getAllAdvisories() {
  return Array.from(inMemoryRelationalStore.advisories.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// Seed default grievance records and critical advisories
if (inMemoryRelationalStore.complaints.size === 0) {
  inMemoryRelationalStore.complaints.set("cmp-101", {
    id: "cmp-101",
    tracking_number: "GRV-2026-881923",
    user_id: "d4e5f6a7-b8c9-4d0e-bf23-456789abcdef",
    tourist_id: "IN-TID-849201",
    tourist_name: "Elena Rostova",
    category: "taxi_overcharging",
    vendor_name: "Airport Prepaid Taxi Kiosk 4",
    amount: "4500",
    currency: "INR",
    location: "Indira Gandhi International Airport, Terminal 3, New Delhi",
    latitude: 28.5562,
    longitude: 77.1000,
    description: "Driver refused prepaid receipt validity upon arrival in Aerocity and demanded ₹4,500 cash under threat of abandoning luggage on road.",
    urgency: "medium",
    status: "under_investigation",
    assigned_officer: "Delhi Traffic Police Liaison SI Sharma",
    resolution_notes: "Kiosk CCTV reviewed. Taxi license plate DL-1T-4912 summoned for inquiry at IGI Airport Traffic Post.",
    ai_triage: {
      risk_score: 74,
      classification: "Prepaid Taxi Extortion & Luggage Intimidation",
      recommended_action: "Forward to Delhi Airport Traffic Authority & Summons Driver",
      tags: ["Overcharging", "Prepaid Taxi", "Airport T3"],
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  });

  inMemoryRelationalStore.complaints.set("cmp-102", {
    id: "cmp-102",
    tracking_number: "GRV-2026-920441",
    user_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    tourist_id: "IN-TID-912044",
    tourist_name: "Marcus Vance",
    category: "fake_tour_guide",
    vendor_name: "Taj Western Gate Tout Squad",
    amount: "8000",
    currency: "INR",
    location: "Taj Ganj, Western Gate, Agra",
    latitude: 27.1751,
    longitude: 78.0421,
    description: "Unregistered guide claimed monument was closed for VIP delegation and diverted our family to an unauthorized marble showroom where high-pressure sales were attempted.",
    urgency: "high",
    status: "submitted",
    assigned_officer: null,
    resolution_notes: null,
    ai_triage: {
      risk_score: 88,
      classification: "Monument Closure Hoax & Emporium Diversion",
      recommended_action: "Dispatch Taj Ganj Tourist Police Squad; Verify ASI License",
      tags: ["Fake Guide", "Emporium Scam", "Taj Ganj"],
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
  });

  inMemoryRelationalStore.complaints.set("cmp-103", {
    id: "cmp-103",
    tracking_number: "GRV-2026-389102",
    user_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    tourist_id: "IN-TID-389102",
    tourist_name: "Aiko Tanaka",
    category: "hotel_fraud",
    vendor_name: "Paharganj Heritage Lodge",
    amount: "6200",
    currency: "INR",
    location: "Main Bazaar, Paharganj, New Delhi",
    latitude: 28.6415,
    longitude: 77.2144,
    description: "Hotel refused to honor prepaid Agoda reservation, claiming platform failure, and forced cash payment at inflated rates at 11 PM.",
    urgency: "high",
    status: "resolved",
    assigned_officer: "Paharganj Tourist Police Inspector Verma",
    resolution_notes: "Police patrol visited the hotel. Hotel acknowledged glitch, refunded cash payment in full, and provided room receipt.",
    ai_triage: {
      risk_score: 82,
      classification: "Late-Night Hostile Booking Repudiation",
      recommended_action: "Immediate Physical Police Intervention at Main Bazaar",
      tags: ["Hotel Fraud", "Overbilling", "Paharganj Hotspot"],
    },
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  });
}

if (inMemoryRelationalStore.advisories.size === 0) {
  inMemoryRelationalStore.advisories.set("adv-1", {
    id: "adv-1",
    title: "Coastal Safety Alert: Strong Rip Currents at Baga & Calangute",
    body: "Goa Lifesavers have raised Red Flags along North Goa beaches due to strong evening swell. Swimming prohibited after 18:00.",
    severity: "danger",
    location: "Goa Coastal Belt",
    issuedBy: "Drishti Marine & Goa Tourist Police",
    category: "hazard",
    createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  });

  inMemoryRelationalStore.advisories.set("adv-2", {
    id: "adv-2",
    title: "Scam Advisory: Unauthorized Ticket Touts near Agra Fort",
    body: "ASI notices unauthorized agents claiming ticket servers are down. Purchase authentic entry tickets exclusively at asionline.asi.gov.in.",
    severity: "warning",
    location: "Agra Heritage Zone",
    issuedBy: "UP Tourism Police Command",
    category: "scam",
    createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
  });
}
