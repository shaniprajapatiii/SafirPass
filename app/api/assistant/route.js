import { NextResponse } from "next/server";
import { generateSafetyResponse } from "@/lib/ai-safety";
import { queryFastApiAssistant } from "@/lib/fastapi";
import { getSession } from "@/lib/jwt";

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, language, location } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A message string is required." },
        { status: 400 }
      );
    }

    // 1. Try Google Gemini LLM / SafirPass AI Safety Engine
    const aiResult = await generateSafetyResponse({
      message: message.trim(),
      language: language || "en",
      location: location || null,
    });

    if (aiResult?.success) {
      return NextResponse.json(aiResult);
    }

    // 2. Try FastAPI fallback service
    const fastApiResult = await queryFastApiAssistant({
      message: message.trim(),
      language: language || "en",
    });

    if (fastApiResult.ok && fastApiResult.data) {
      return NextResponse.json({
        success: true,
        provider: "FastAPI Safety Assistant",
        ...fastApiResult.data,
      });
    }

    return NextResponse.json({
      success: true,
      provider: "SafirPass Emergency Safety Protocol",
      response: "If you are in immediate danger or need emergency assistance, dial 112 directly. You can also trigger the SOS button on your dashboard to notify Indian authorities.",
      intent: "emergency",
    });
  } catch (err) {
    console.error("[Assistant Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error querying assistant." },
      { status: 500 }
    );
  }
}
