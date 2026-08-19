export const ATTRIBUTES = [
  { key: "full_name", label: "Full name", hint: "As printed on your passport" },
  { key: "nationality", label: "Nationality", hint: "Country of citizenship" },
  {
    key: "tourist_id",
    label: "Tourist ID number",
    hint: "Your unique SafirPass number",
  },
  {
    key: "passport_number",
    label: "Passport number (masked)",
    hint: "Only the last 4 characters",
  },
  { key: "visa", label: "Visa type & number", hint: "Category and reference" },
  {
    key: "validity",
    label: "Stay validity",
    hint: "Entry and planned exit dates",
  },
  {
    key: "emergency_contact",
    label: "Emergency contact",
    hint: "Shared with responders only",
  },
];

export function maskPassport(value) {
  if (!value) return "—";
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function attributeValue(kyc, key) {
  if (!kyc) return "—";
  switch (key) {
    case "full_name":
      return kyc.full_name || "—";
    case "nationality":
      return kyc.nationality || "—";
    case "tourist_id":
      return kyc.tourist_id || "IN-TID-884920";
    case "passport_number":
      return maskPassport(kyc.passport_number);
    case "visa":
      return (
        [kyc.visa_type, kyc.visa_number].filter(Boolean).join(" · ") ||
        "e-Tourist Visa (30 Days)"
      );
    case "validity":
      return `${kyc.entry_date || "2026-08-10"} → ${kyc.exit_date || "2026-09-09"}`;
    case "emergency_contact":
      return kyc.emergency_contact || "+91 98765 43210";
    default:
      return "—";
  }
}

function toBase64Url(input) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input) {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeShare(payload) {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShare(token) {
  try {
    const jsonStr = fromBase64Url(token);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (parsed?.v !== 1 || !Array.isArray(parsed.fields)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShare(kyc, keys) {
  return {
    v: 1,
    tid: kyc?.tourist_id || "IN-TID-884920",
    iss: new Date().toISOString(),
    fields: ATTRIBUTES.filter((a) => keys.includes(a.key)).map((a) => ({
      label: a.label,
      value: attributeValue(kyc, a.key),
    })),
  };
}

export function barcodeValue(kyc) {
  const base = (kyc?.tourist_id || "IN-TID-884920").replace(/[^A-Z0-9]/gi, "");
  const check = Array.from(kyc?.id || "default-id").reduce(
    (acc, c) => (acc + c.charCodeAt(0)) % 9973,
    7,
  );
  return `${base}${String(check).padStart(4, "0")}`;
}

export const OFFLINE_CACHE_KEY = "safirpass.offline.credential";
