// Lightweight JWT HMAC SHA-256 Signer & Verifier using Web Crypto API

const JWT_SECRET = process.env.JWT_SECRET || "safirpass-jwt-secret-key-production-grade-2026";

async function getCryptoKey() {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

export async function signJwt(payload, expiresInSeconds = 86400 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dataToSign)
  );

  let binary = "";
  const bytes = new Uint8Array(signatureBuffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const encodedSignature = base64UrlEncode(binary);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const key = await getCryptoKey();

    const rawSig = base64UrlDecode(encodedSignature);
    const sigBytes = new Uint8Array(rawSig.length);
    for (let i = 0; i < rawSig.length; i++) {
      sigBytes[i] = rawSig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the safirpass_session JWT from a Next.js Request
 * @param {Request} request
 * @returns {Promise<Object|null>}
 */
export async function getSession(request) {
  try {
    if (!request) return null;
    let token = null;

    if (request.cookies && typeof request.cookies.get === "function") {
      const cookie = request.cookies.get("safirpass_session");
      token = cookie?.value;
    } else if (request.headers && typeof request.headers.get === "function") {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/safirpass_session=([^;]+)/);
      token = match ? match[1] : null;
    }

    if (!token) return null;
    return await verifyJwt(token);
  } catch {
    return null;
  }
}

