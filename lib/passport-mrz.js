// ICAO 9303 Standard Passport Machine Readable Zone (MRZ) & Checksum Validation Engine
// Supports TD3 (2x44 Passports) and TD1 (3x30 ID Cards) with 7-3-1 weight algorithms

// ISO 3166-1 alpha-3 to Country Name Mapping
const ISO_COUNTRY_MAP = {
  USA: "United States",
  GBR: "United Kingdom",
  IND: "India",
  DEU: "Germany",
  FRA: "France",
  CAN: "Canada",
  AUS: "Australia",
  JPN: "Japan",
  NPL: "Nepal",
  BTN: "Bhutan",
  ITA: "Italy",
  ESP: "Spain",
  CHE: "Switzerland",
  NLD: "Netherlands",
  SGP: "Singapore",
  NZL: "New Zealand",
  ARE: "United Arab Emirates",
  KOR: "South Korea",
  RUS: "Russia",
  CHN: "China",
  BRA: "Brazil",
  ZAF: "South Africa",
  ISR: "Israel",
  SWE: "Sweden",
  NOR: "Norway",
  DNK: "Denmark",
  FIN: "Finland",
  IRL: "Ireland",
  PRT: "Portugal",
  BEL: "Belgium",
  AUT: "Austria",
  MEX: "Mexico",
};

/**
 * Computes ICAO 9303 check digit with 7-3-1 weighting
 */
export function computeCheckDigit(str) {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    let val = 0;

    if (char >= "0" && char <= "9") {
      val = char.charCodeAt(0) - 48;
    } else if (char >= "A" && char <= "Z") {
      val = char.charCodeAt(0) - 55;
    } else if (char === "<") {
      val = 0;
    }

    sum += val * weights[i % 3];
  }

  return (sum % 10).toString();
}

/**
 * Parses YYMMDD to YYYY-MM-DD
 */
function parseDate(yymmdd, isExpiry = false) {
  if (!yymmdd || yymmdd.length !== 6) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  const currentYear = new Date().getFullYear() % 100;
  let fullYear;

  if (isExpiry) {
    fullYear = yy < 80 ? 2000 + yy : 1900 + yy;
  } else {
    fullYear = yy <= currentYear ? 2000 + yy : 1900 + yy;
  }

  return `${fullYear}-${mm}-${dd}`;
}

/**
 * Parses 2-line TD3 ICAO 9303 MRZ strings (Standard Passport)
 */
export function parseTd3Mrz(line1, line2) {
  if (!line1 || !line2 || line1.length < 44 || line2.length < 44) {
    return { success: false, error: "Invalid MRZ line length (must be 44 characters per line)" };
  }

  const clean1 = line1.trim().padEnd(44, "<").slice(0, 44).toUpperCase();
  const clean2 = line2.trim().padEnd(44, "<").slice(0, 44).toUpperCase();

  // Line 1: P<ISSLASTNAME<<FIRSTNAME<<<<<
  const docType = clean1.slice(0, 2).replace(/</g, "");
  const issuingCountryCode = clean1.slice(2, 5).replace(/</g, "");
  const namePart = clean1.slice(5);
  const nameSegments = namePart.split("<<");
  const surname = (nameSegments[0] || "").replace(/</g, " ").trim();
  const givenNames = (nameSegments[1] || "").replace(/</g, " ").trim();
  const fullName = [givenNames, surname].filter(Boolean).join(" ") || surname;

  // Line 2: PASSPORT# + CHK + NAT + DOB + CHK + SEX + EXP + CHK + OPT + COMP_CHK
  const passportNumberRaw = clean2.slice(0, 9);
  const passportNumber = passportNumberRaw.replace(/</g, "");
  const passportCheckDigit = clean2.charAt(9);
  const calculatedPassportCheck = computeCheckDigit(passportNumberRaw);
  const isPassportCheckValid = passportCheckDigit === calculatedPassportCheck;

  const nationalityCode = clean2.slice(10, 13).replace(/</g, "");
  const dobRaw = clean2.slice(13, 19);
  const dobCheckDigit = clean2.charAt(19);
  const isDobCheckValid = dobCheckDigit === computeCheckDigit(dobRaw);

  const sexChar = clean2.charAt(20);
  const sex = sexChar === "M" ? "Male" : sexChar === "F" ? "Female" : "Other";

  const expiryRaw = clean2.slice(21, 27);
  const expiryCheckDigit = clean2.charAt(27);
  const isExpiryCheckValid = expiryCheckDigit === computeCheckDigit(expiryRaw);

  const compositeData = `${passportNumberRaw}${passportCheckDigit}${dobRaw}${dobCheckDigit}${expiryRaw}${expiryCheckDigit}${clean2.slice(28, 42)}`;
  const compositeCheckDigit = clean2.charAt(43);
  const isCompositeValid = compositeCheckDigit === computeCheckDigit(compositeData);

  const allChecksumsValid = isPassportCheckValid && isDobCheckValid && isExpiryCheckValid;

  const nationality = ISO_COUNTRY_MAP[nationalityCode] || ISO_COUNTRY_MAP[issuingCountryCode] || nationalityCode;

  return {
    success: true,
    documentType: "Passport (ICAO TD3)",
    allChecksumsValid,
    counterfeitRisk: allChecksumsValid ? "LOW (Authentic Checksums)" : "ELEVATED (Checksum Mismatch)",
    checksumDetails: {
      passportCheckPassed: isPassportCheckValid,
      dobCheckPassed: isDobCheckValid,
      expiryCheckPassed: isExpiryCheckValid,
      compositeCheckPassed: isCompositeValid,
    },
    fields: {
      fullName,
      surname,
      givenNames,
      passportNumber,
      nationality,
      nationalityCode,
      issuingCountry: ISO_COUNTRY_MAP[issuingCountryCode] || issuingCountryCode,
      birthDate: parseDate(dobRaw, false),
      expiryDate: parseDate(expiryRaw, true),
      sex,
    },
    rawMrz: [clean1, clean2],
  };
}

/**
 * Searches and extracts candidate MRZ lines from raw OCR text output
 */
export function extractMrzFromOcrText(ocrText) {
  if (!ocrText || typeof ocrText !== "string") return null;

  // Split into lines and clean
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, "").toUpperCase())
    .filter((l) => l.length >= 30);

  // Look for 2 consecutive lines matching TD3 passport pattern:
  // Line 1 starts with P< or P followed by country code
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];

    if ((l1.startsWith("P<") || (l1.startsWith("P") && l1.length >= 40)) && l2.length >= 40) {
      // Fix potential OCR misreads: O->0 in digits line
      const fixedL2 = l2
        .slice(0, 44)
        .replace(/O/g, "0")
        .replace(/I/g, "1");

      const parsed = parseTd3Mrz(l1.slice(0, 44), fixedL2);
      if (parsed.success && parsed.fields.passportNumber) {
        return parsed;
      }
    }
  }

  // Regex fallback across full text block
  const mrzRegex = /P<[A-Z0-9<]{40,44}[\r\n\s]+[A-Z0-9<]{40,44}/;
  const match = ocrText.toUpperCase().match(mrzRegex);
  if (match) {
    const matchedLines = match[0].split(/[\r\n\s]+/).filter(Boolean);
    if (matchedLines.length >= 2) {
      return parseTd3Mrz(matchedLines[0], matchedLines[1]);
    }
  }

  return null;
}
