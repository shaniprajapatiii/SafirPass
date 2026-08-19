// Helper utility to validate UUIDs and deterministically convert any ID string (such as Google OAuth numeric sub IDs or custom string IDs) into a valid PostgreSQL UUID v4 string.

export function toValidUuid(input) {
  if (!input) return "00000000-0000-4000-8000-000000000000";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;

  let hash1 = 5381;
  let hash2 = 0x811c9dc5;
  const str = String(input);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = Math.imul(hash2 ^ char, 0x01000193);
  }

  let hex = "";
  let state = Math.abs(hash1) + Math.abs(hash2);
  for (let i = 0; i < 32; i++) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    hex += Math.floor((state / 4294967296) * 16).toString(16);
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
