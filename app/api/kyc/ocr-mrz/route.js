import { NextResponse } from "next/server";
import { extractMrzFromOcrText, parseTd3Mrz } from "@/lib/passport-mrz";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { imageBase64, ocrText } = body;

    // A) If OCR text was already extracted on client via Tesseract
    if (ocrText && typeof ocrText === "string") {
      const parsedMrz = extractMrzFromOcrText(ocrText);
      if (parsedMrz) {
        return NextResponse.json({
          success: true,
          mrzFound: true,
          ...parsedMrz,
        });
      }
    }

    let cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, "") : "";

    // If imageUrl provided instead of base64, fetch it
    if (!cleanBase64 && body.imageUrl && typeof body.imageUrl === "string" && body.imageUrl.startsWith("http")) {
      try {
        const imgRes = await fetch(body.imageUrl);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          cleanBase64 = Buffer.from(arrayBuffer).toString("base64");
        }
      } catch (imgErr) {
        console.warn("[OCR MRZ Image Fetch Note]:", imgErr.message);
      }
    }

    if (!cleanBase64) {
      return NextResponse.json(
        { error: "imageBase64, imageUrl, or ocrText is required for passport extraction." },
        { status: 400 }
      );
    }

    // B) Check if AWS Rekognition is enabled and configured for Text Detection
    let awsOcrText = "";
    if (
      process.env.REKOGNITION_ENABLED === "true" &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    ) {
      try {
        const { RekognitionClient, DetectTextCommand } = await import("@aws-sdk/client-rekognition");
        const client = new RekognitionClient({
          region: process.env.AWS_REGION || "ap-south-1",
        });

        const imageBytes = Buffer.from(cleanBase64, "base64");
        const command = new DetectTextCommand({
          Image: { Bytes: imageBytes },
        });

        const response = await client.send(command);
        const textDetections = response.TextDetections || [];
        awsOcrText = textDetections
          .filter((d) => d.Type === "LINE")
          .map((d) => d.DetectedText)
          .join("\n");
      } catch (awsErr) {
        console.warn("[AWS Rekognition Textract note]:", awsErr.message);
      }
    }

    // Try parsing AWS Rekognition text if obtained
    if (awsOcrText) {
      const parsed = extractMrzFromOcrText(awsOcrText);
      if (parsed) {
        return NextResponse.json({
          success: true,
          mrzFound: true,
          engine: "AWS Rekognition Text Detection",
          ...parsed,
        });
      }
    }

    // C) Fallback to Tesseract.js local OCR engine
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const buffer = Buffer.from(cleanBase64, "base64");
      const ret = await worker.recognize(buffer);
      await worker.terminate();

      const extractedText = ret.data.text || "";
      const parsed = extractMrzFromOcrText(extractedText);

      if (parsed) {
        return NextResponse.json({
          success: true,
          mrzFound: true,
          engine: "Tesseract OCR Engine",
          ...parsed,
        });
      }

      // If strict MRZ not detected, use heuristic regex pattern matching
      const passportMatch = extractedText.match(/[A-Z0-9]{8,10}/);
      const lines = extractedText.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);

      return NextResponse.json({
        success: true,
        mrzFound: false,
        engine: "Tesseract OCR (Heuristic Fallback)",
        counterfeitRisk: "MANUAL VERIFICATION REQUIRED",
        fields: {
          passportNumber: passportMatch ? passportMatch[0] : "",
          rawTextSample: lines.slice(0, 5).join(" | "),
        },
      });
    } catch (tesseractErr) {
      console.warn("[Tesseract OCR Error]:", tesseractErr.message);
      return NextResponse.json({
        success: false,
        error: `OCR extraction failed: ${tesseractErr.message}`,
      });
    }
  } catch (err) {
    console.error("[OCR MRZ Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process passport OCR." },
      { status: 500 }
    );
  }
}
