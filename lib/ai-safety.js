// SafirPass AI Tourist Safety & Emergency Intelligence Engine
// Integrates Google Gemini LLM with context-rich Indian tourism & emergency protocols,
// with robust multi-layered multilingual fallback.

const INDIAN_EMERGENCY_CONTACTS = {
  allInOne: "112",
  police: "100",
  ambulance: "102 / 108",
  fire: "101",
  touristHelpline: "1363 (24x7 Multi-lingual Incredible India Helpline)",
  womenHelpline: "1091",
  railwaySecurity: "139",
  medicalAssistance: "104",
};

const TOURIST_SAFETY_KNOWLEDGE = [
  {
    keywords: ["emergency", "danger", "help", "attack", "hurt", "injured", "accident", "bleeding", "hospital", "police", "dying"],
    intent: "emergency",
    category: "medical",
    advice: "🚨 IMMEDIATE EMERGENCY PROTOCOL: Dial 112 immediately for Pan-India emergency response. Move to a crowded, well-lit public establishment (hotel lobby, metro station, or hospital). If you pressed SOS in SafirPass, your live coordinates and verified passport identity have been routed to local emergency dispatch.",
    actionSteps: [
      "Dial 112 directly from any phone (free call).",
      "Trigger the Red Panic Button on SafirPass SOS page.",
      "Stay in an open, occupied public space or approach uniformed personnel.",
      "Keep your SafirPass digital QR ready for first responders.",
    ],
    emergencyNumbers: ["112 (National Emergency)", "102 / 108 (Ambulance)", "100 (Police)"],
  },
  {
    keywords: ["scam", "cheat", "touts", "fake", "closed", "ticket", "overcharge", "taxi", "rickshaw", "driver"],
    intent: "scam_alert",
    category: "scam",
    advice: "⚠️ TOURIST SCAM ADVISORY: A common scam in tourist hubs (such as Agra, Delhi Railway Station, Paharganj, Jaipur) involves drivers or touts claiming 'your hotel is closed/burned down' or 'the monument is closed today for a festival' to divert you to expensive fake emporiums. Never believe these claims without checking directly.",
    actionSteps: [
      "Buy monument tickets ONLY from official ASI counters or asionline.asi.gov.in.",
      "Always insist on metered rides or use pre-paid government booths / verified ride apps (Uber, Ola).",
      "Do not hand over physical passport or original documents to touts or unverified vendors.",
      "Dial 1363 (Incredible India Tourist Helpline) to report harassment or verify claims.",
    ],
    emergencyNumbers: ["1363 (Tourist Helpline)", "112 (Police Dispatch)"],
  },
  {
    keywords: ["lost", "passport", "theft", "stolen", "bag", "wallet", "documents", "embassy"],
    intent: "lost_document",
    category: "legal",
    advice: "🛂 LOST PASSPORT & TRAVEL DOCUMENT PROCEDURE: If your physical passport is lost or stolen, do not panic. SafirPass holds your tamper-evident cryptographically signed digital identity credential which serves as instant temporary proof.",
    actionSteps: [
      "File an online e-FIR (First Information Report) or visit the nearest Tourist Police station.",
      "Contact your country's Embassy or Consulate in New Delhi or regional consulates (Mumbai, Kolkata, Chennai).",
      "Present your SafirPass Digital ID QR code to authorities for quick passport detail verification.",
      "Apply for an Emergency Certificate (EC) or replacement passport via your Embassy, followed by an exit permit from the Indian FRRO (e-FRRO portal).",
    ],
    emergencyNumbers: ["112 (Police e-FIR)", "1363 (Tourist Bureau)"],
  },
  {
    keywords: ["safe", "night", "woman", "female", "alone", "travel", "solo", "area", "cab", "metro"],
    intent: "general_safety",
    category: "safety",
    advice: "🛡️ SOLO TRAVEL & NIGHT SAFETY PROTOCOL: India has extensive tourist safety measures, including dedicated Tourist Police in major cities and women-only coaches in Metro systems (Delhi, Mumbai, Bengaluru, Kolkata).",
    actionSteps: [
      "When traveling at night, use verified app cabs (Uber, Ola, BluSmart) and share your live ride status with friends or SafirPass.",
      "Save 1091 (Women Helpline) and 112 on speed dial.",
      "Stick to well-lit main roads and populated transit stations after 10 PM.",
      "Drink only packaged, sealed mineral water and eat at busy, hygienic eateries.",
    ],
    emergencyNumbers: ["1091 (Women Helpline)", "112 (Emergency)", "1363 (Tourist Advisory)"],
  },
  {
    keywords: ["sim", "card", "hotel", "check in", "form c", "wifi", "internet", "rental", "bike", "car"],
    intent: "service_guidance",
    category: "services",
    advice: "📱 SAFIRPASS DIGITAL CHECK-IN: You do not need to leave your physical passport or surrender paper photocopies with hotel receptions, SIM vendors, or vehicle rentals. Present your dynamic rotating SafirPass QR code from the dashboard.",
    actionSteps: [
      "Open Dashboard -> Dynamic QR Code.",
      "The service provider scans your QR code with their SafirPass terminal.",
      "You receive an instant approval request on your phone showing exactly which attributes they are requesting.",
      "Tap 'Approve' to securely authorize Form-C or service fulfillment.",
    ],
    emergencyNumbers: ["1363 (Tourist Services)"],
  },
];

/**
 * Calls Google Gemini LLM API with specialized tourist safety system instructions.
 */
async function callGeminiApi(apiKey, userMessage, language = "en") {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `
You are the official SafirPass AI Tourist Safety & Emergency Advisor in India.
You provide clear, accurate, and calm safety instructions, scam warnings, medical advice, and legal guidance for international tourists traveling across India.
Always prioritize tourist physical safety.
Include official emergency phone numbers when relevant:
- 112: All-in-One Pan-India Emergency
- 1363: 24/7 Incredible India Multilingual Tourist Helpline
- 100: Police
- 102/108: Ambulance / Medical
- 1091: Women Helpline
Always advise tourists to NEVER hand over physical original passports to unauthorized touts.
Reply in the requested language: ${language}.
Keep responses structured, concise, and actionable with bullet points for immediate steps.
`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nTourist Query: ${userMessage}` }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text received from Gemini API.");
  }

  return text;
}

/**
 * Intelligent safety query engine.
 * Tries Google Gemini API first if configured, then FastAPI AI service, then context-aware expert safety knowledge base.
 */
export async function generateSafetyResponse({ message, language = "en", location = null }) {
  const cleanMessage = (message || "").trim();
  const lowerMsg = cleanMessage.toLowerCase();

  // Determine intent using keyword density and urgency scoring
  let bestRule = null;
  let maxScore = 0;

  for (const rule of TOURIST_SAFETY_KNOWLEDGE) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lowerMsg.includes(kw)) {
        score += kw.length > 4 ? 2 : 1;
      }
    }

    // Emergency urgency weight
    if (rule.intent === "emergency" && (lowerMsg.includes("emergency") || lowerMsg.includes("help") || lowerMsg.includes("danger") || lowerMsg.includes("attack") || lowerMsg.includes("police") || lowerMsg.includes("hospital"))) {
      score += 5;
    }
    // Scam detection urgency weight
    if (rule.intent === "scam_alert" && (lowerMsg.includes("scam") || lowerMsg.includes("closed") || lowerMsg.includes("burned") || lowerMsg.includes("shop") || lowerMsg.includes("fake") || lowerMsg.includes("tout"))) {
      score += 4;
    }

    if (score > maxScore) {
      maxScore = score;
      bestRule = rule;
    }
  }

  const matchedRule = bestRule;
  const intent = matchedRule ? matchedRule.intent : "general_safety";
  const category = matchedRule ? matchedRule.category : "safety";

  // Check if Google Gemini API key is available
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_KEY;

  if (geminiKey) {
    try {
      const geminiResponse = await callGeminiApi(geminiKey, cleanMessage, language);
      return {
        success: true,
        provider: "Google Gemini 2.0 Flash AI",
        intent,
        category,
        response: geminiResponse,
        actionSteps: matchedRule?.actionSteps || [
          "Follow verified official advisories.",
          "Keep SafirPass digital credentials accessible.",
          "Dial 112 for immediate emergencies.",
        ],
        emergencyNumbers: matchedRule?.emergencyNumbers || ["112 (Emergency)", "1363 (Tourist Helpline)"],
        contacts: INDIAN_EMERGENCY_CONTACTS,
      };
    } catch (geminiErr) {
      console.warn("[Gemini API Warning, falling back to local Safety Engine]:", geminiErr.message);
    }
  }

  // Multilingual local expert response fallback
  let responseText = matchedRule?.advice;

  if (!responseText) {
    responseText = `SafirPass Tourist Safety Desk: I am here to guide your travel safety in India. For any immediate danger or medical distress, dial 112 immediately. If you need help with scams, lodging, Form-C, or transport, ask me or visit our verified services directory.`;
  }

  // Handle basic translations for common languages
  if (language === "hi") {
    if (intent === "emergency") {
      responseText = "🚨 आपातकालीन सूचना: तुरंत 112 पर कॉल करें। सुरक्षित सार्वजनिक स्थान पर रहें। SafirPass SOS बटन दबाकर अपनी लाइव लोकेशन आपातकालीन सेवा को भेजें।";
    } else if (intent === "scam_alert") {
      responseText = "⚠️ धोखाधड़ी चेतावनी: अनधिकृत गाइड और फर्जी टिकट दलालों से बचें। भारतीय पुरातत्व सर्वेक्षण (ASI) के आधिकारिक काउंटर से ही टिकट खरीदें। सहायता के लिए 1363 डायल करें।";
    }
  } else if (language === "es") {
    if (intent === "emergency") {
      responseText = "🚨 PROTOCOLO DE EMERGENCIA: Llame inmediatamente al 112 para asistencia en toda la India. Vaya a un lugar público iluminado. Use el botón de pánico SOS en SafirPass.";
    }
  } else if (language === "fr") {
    if (intent === "emergency") {
      responseText = "🚨 PROTOCOLE D'URGENCE: Appelez immédiatement le 112 pour les urgences en Inde. Rejoignez un lieu public sécurisé et utilisez le bouton d'alerte SOS SafirPass.";
    }
  }

  return {
    success: true,
    provider: "SafirPass Expert Tourist Safety Engine",
    intent,
    category,
    response: responseText,
    actionSteps: matchedRule?.actionSteps || [
      "Stay in illuminated public areas.",
      "Do not give original passport to unauthorized agents.",
      "Call 112 for emergency dispatch.",
    ],
    emergencyNumbers: matchedRule?.emergencyNumbers || ["112 (Emergency)", "1363 (Tourist Helpline)"],
    contacts: INDIAN_EMERGENCY_CONTACTS,
  };
}

/**
 * AI Grievance Triage Evaluator for tourist complaints & scam reports.
 * Employs Gemini 2.0 Flash or expert rule classification.
 */
export async function triageComplaintAi({
  category = "scam",
  description = "",
  amount = "",
  currency = "INR",
  location = "",
  vendorName = "",
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are the Republic of India Ministry of Tourism & National Police Tourist Grievance AI Triage Unit.
Analyze this tourist complaint and provide strict JSON output:
- Category: ${category}
- Vendor: ${vendorName || "Unknown"}
- Claimed Extortion / Loss: ${currency} ${amount || "N/A"}
- Location: ${location || "Unknown"}
- Tourist Incident Report: "${description}"

Return ONLY valid JSON matching this schema:
{
  "risk_score": <number between 10 and 98>,
  "urgency": <"low" | "medium" | "high" | "critical">,
  "classification": <concise summary of grievance or scam pattern>,
  "recommended_action": <action for Tourist Police or Consumer Redressal>,
  "tags": [<3-4 short keyword tags>]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            provider: "Google Gemini 2.0 Flash Grievance Classifier",
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn("[Gemini Grievance Triage Warning]:", e.message);
    }
  }

  // Expert domain rule fallback
  const descLower = (description + " " + location + " " + vendorName).toLowerCase();
  let baseScore = 55;
  let urgency = "medium";
  let classification = "Commercial Dispute / Overcharging";
  let recommendedAction = "Summon vendor for conciliation and verify trade license";
  const tags = ["Tourist Complaint"];

  if (category === "fake_tour_guide" || descLower.includes("closed") || descLower.includes("guide") || descLower.includes("emporium")) {
    baseScore = 85;
    urgency = "high";
    classification = "Monument Closure Hoax & Unauthorized Emporium Diversion";
    recommendedAction = "Dispatch Local Tourist Police Squad; Cross-check ASI Licensed Guide Register";
    tags.push("Fake Guide", "ASI Violation", "Emporium Scam");
  } else if (category === "taxi_overcharging" || descLower.includes("prepaid") || descLower.includes("cab") || descLower.includes("meter")) {
    baseScore = 72;
    urgency = descLower.includes("threat") || descLower.includes("luggage") ? "high" : "medium";
    classification = "Prepaid Transport Extortion & Fare Gouging";
    recommendedAction = "Alert Traffic Police Pre-paid Booth Control; Impound vehicle if meter tampered";
    tags.push("Taxi Extortion", "Rigged Meter", "Transport Fraud");
  } else if (category === "hotel_fraud" || descLower.includes("hotel") || descLower.includes("booking") || descLower.includes("cancelled")) {
    baseScore = 80;
    urgency = "high";
    classification = "Late-Night Hostile Lodging Repudiation / Double Billing";
    recommendedAction = "Inspect Hotel Registry under Form-C / Sarai Act; Enforce prepaid reservation";
    tags.push("Hotel Fraud", "Overbilling", "Lodging Violation");
  } else if (category === "theft" || descLower.includes("stolen") || descLower.includes("lost") || descLower.includes("passport")) {
    baseScore = 92;
    urgency = "critical";
    classification = "Passport / Essential Luggage Theft in Transit";
    recommendedAction = "File Immediate e-FIR & Issue Expedited Police Verification Certificate";
    tags.push("Theft", "Lost Passport", "Urgent Investigation");
  } else {
    tags.push("General Consumer Grievance");
  }

  return {
    provider: "SafirPass Police Safety Rules Engine",
    risk_score: baseScore,
    urgency,
    classification,
    recommended_action: recommendedAction,
    tags,
  };
}
