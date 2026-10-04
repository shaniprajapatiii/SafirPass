// Cryptographic Dynamic QR Signer & Verifier for SafirPass
// Implements time-bound, anti-replay, tamper-evident credential verification with HMAC-SHA256 (Web Crypto API)

const QR_SECRET =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_QR_SIGNING_SECRET) ||
  (typeof process !== "undefined" && process.env?.QR_SIGNING_SECRET) ||
  (typeof process !== "undefined" && process.env?.JWT_SECRET) ||
  "safirpass-authority-master-signing-key-2026-secure";

const AUTHORITY_ISSUER = "Republic of India Immigration & Ministry of Tourism";

function toBase64Url(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey() {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(QR_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signs a dynamic tourist credential QR token.
 * 
 * @param {Object} params
 * @param {string} params.touristId - e.g. "IN-TID-849201"
 * @param {string} [params.userId] - User UUID
 * @param {Array<{key: string, label: string, value: string}>} params.fields - Disclosed attributes
 * @param {string} [params.status="verified"] - KYC status
 * @param {number} [params.ttlSeconds=60] - Expiration window in seconds (default 60s for dynamic QR)
 * @param {boolean} [params.isOffline=false] - Whether this is an offline emergency enclave pass
 * @returns {Promise<{ token: string, expiresAt: number, issuedAt: number, nonce: string }>}
 */
export async function signDynamicQrToken({
  touristId,
  userId = null,
  fields = [],
  status = "verified",
  ttlSeconds = 60,
  isOffline = false,
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlSeconds;

  // Generate cryptographically secure 12-byte nonce
  const nonceBytes = new Uint8Array(12);
  crypto.getRandomValues(nonceBytes);
  const nonce = toBase64Url(nonceBytes);

  const header = {
    alg: "HS256",
    typ: "SP-DQR",
    v: 2,
    mode: isOffline ? "offline_enclave" : "live_dynamic",
  };

  const payload = {
    tid: touristId,
    uid: userId,
    iss: AUTHORITY_ISSUER,
    iat: issuedAt,
    exp: expiresAt,
    nonce,
    status,
    fields,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dataToSign)
  );

  const encodedSignature = toBase64Url(new Uint8Array(signatureBuffer));
  const token = `${dataToSign}.${encodedSignature}`;

  return {
    token,
    issuedAt,
    expiresAt,
    ttlSeconds,
    nonce,
    mode: header.mode,
  };
}

/**
 * Cryptographically verifies a dynamic or offline SafirPass QR token.
 * 
 * @param {string} token - The 3-part header.payload.signature string
 * @param {number} [allowedClockSkewSeconds=5]
 * @returns {Promise<{
 *   valid: boolean,
 *   expired: boolean,
 *   tampered: boolean,
 *   payload: Object|null,
 *   secondsRemaining?: number,
 *   error?: string
 * }>}
 */
export async function verifyDynamicQrToken(token, allowedClockSkewSeconds = 5) {
  if (!token || typeof token !== "string") {
    return {
      valid: false,
      expired: false,
      tampered: false,
      payload: null,
      error: "No credential token provided",
    };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return {
      valid: false,
      expired: false,
      tampered: true,
      payload: null,
      error: "Malformed credential format. Expected 3-part signed token.",
    };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await getHmacKey();
    const sigBytes = fromBase64Url(encodedSignature);

    const isSignatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isSignatureValid) {
      return {
        valid: false,
        expired: false,
        tampered: true,
        payload: null,
        error: "CRYPTOGRAPHIC SIGNATURE MISMATCH: This QR code has been altered or forged.",
      };
    }

    const payloadText = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(payloadText);

    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);

    // Check expiration
    if (exp && now > exp + allowedClockSkewSeconds) {
      const elapsedSeconds = now - exp;
      return {
        valid: false,
        expired: true,
        tampered: false,
        payload,
        error: `DYNAMIC QR EXPIRED ${elapsedSeconds}s ago. Screenshots are not accepted. Please ask tourist to show live pass.`,
      };
    }

    const secondsRemaining = Math.max(0, exp - now);

    return {
      valid: true,
      expired: false,
      tampered: false,
      payload,
      secondsRemaining,
      mode: payload.mode || "live_dynamic",
      verifiedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      valid: false,
      expired: false,
      tampered: true,
      payload: null,
      error: `Verification error: ${err.message}`,
    };
  }
}

/**
 * Decodes and inspects a QR token without network access or secret requirement.
 * Extracts claims, checks time validity, and formats fields for display.
 * 
 * @param {string} token
 * @returns {{
 *   validFormat: boolean,
 *   header?: Object,
 *   payload?: Object,
 *   expired?: boolean,
 *   secondsRemaining?: number,
 *   error?: string
 * }}
 */
export function decodeQrTokenUnverified(token) {
  if (!token || typeof token !== "string") {
    return { validFormat: false, error: "Empty or invalid token format" };
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { validFormat: false, error: "Expected 3-part signed token (header.payload.signature)" };
  }
  try {
    const [h, p, s] = parts;
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(h)));
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(p)));
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);
    const expired = exp > 0 && now > exp;
    const secondsRemaining = Math.max(0, exp - now);
    return {
      validFormat: true,
      header,
      payload,
      expired,
      secondsRemaining,
      signature: s,
    };
  } catch (err) {
    return { validFormat: false, error: `Failed to decode token: ${err.message}` };
  }
}
