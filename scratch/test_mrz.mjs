import { computeCheckDigit, parseTd3Mrz, extractMrzFromOcrText } from "../lib/passport-mrz.js";

// Standard Sample TD3 Passport MRZ:
// Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
// Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10
const line1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const line2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

console.log("--- Testing computeCheckDigit ---");
const chk1 = computeCheckDigit("L898902C3");
console.log("Check digit for L898902C3:", chk1, "Expected: 6 ->", chk1 === "6" ? "PASS" : "FAIL");

const chkDob = computeCheckDigit("740812");
console.log("Check digit for DOB 740812:", chkDob, "Expected: 2 ->", chkDob === "2" ? "PASS" : "FAIL");

const chkExp = computeCheckDigit("120415");
console.log("Check digit for Expiry 120415:", chkExp, "Expected: 9 ->", chkExp === "9" ? "PASS" : "FAIL");

console.log("\n--- Testing parseTd3Mrz ---");
const parsed = parseTd3Mrz(line1, line2);
console.log("Parsed result:", JSON.stringify(parsed, null, 2));

console.log("\n--- Testing extractMrzFromOcrText with noisy OCR text ---");
const noisyOcr = `
PASSPORT / PASSEPORT
REPUBLIC OF UTOPIA
SURNAME: ERIKSSON
GIVEN NAMES: ANNA MARIA
NATIONALITY: UTOPIAN
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10
Authority: Department of State
`;
const extracted = extractMrzFromOcrText(noisyOcr);
console.log("Extracted from noisy text:", extracted?.fields?.fullName, extracted?.fields?.passportNumber);
if (extracted && extracted.fields.passportNumber === "L898902C3") {
  console.log(">>> EXTRACT FROM NOISY OCR PASSED! <<<");
} else {
  console.error(">>> EXTRACT FROM NOISY OCR FAILED! <<<");
  process.exit(1);
}

if (parsed.success && parsed.allChecksumsValid) {
  console.log("\n>>> ALL MRZ TESTS PASSED SUCCESSFULLY! <<<");
} else {
  console.error("\n>>> MRZ TEST FAILED! <<<");
  process.exit(1);
}
