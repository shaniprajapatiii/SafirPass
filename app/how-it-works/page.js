import Link from "next/link";
import { ScanFace, FileText, ShieldCheck, QrCode, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "How It Works — SafirPass Digital Identity Verification",
  description: "Learn how SafirPass extracts passport OCR, verifies face liveness, generates dynamic rotating QR codes, and secures data with zero-knowledge proofs.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <FileText className="size-8 text-blue-600" />,
      title: "1. Passport & Visa OCR Extraction",
      body: "Upon registering, travellers upload their physical passport data page and visa documentation. Our automated OCR pipeline extracts key fields (Full Name, Passport Number, Nationality, Expiry Date, Visa Category, and Validity).",
    },
    {
      icon: <ScanFace className="size-8 text-blue-600" />,
      title: "2. Real-Time Face Liveness Check",
      body: "To prevent identity fraud or selfie spoofing, travellers complete a 5-second live face scan via their smartphone camera. Biometric facial embeddings are matched against the official passport photo using deep liveness detection models.",
    },
    {
      icon: <ShieldCheck className="size-8 text-blue-600" />,
      title: "3. Authority Vetting & Device Binding",
      body: "Once background immigration records validate the e-Visa, SafirPass issues an official Digital Tourist ID. The cryptographic key is bound to the smartphone hardware enclave (TPM/Keychain), preventing credential cloning across unauthorized devices.",
    },
    {
      icon: <QrCode className="size-8 text-blue-600" />,
      title: "4. Dynamic Rotating QR (TRP)",
      body: "Instead of static screenshots or paper copies, SafirPass generates a dynamic QR code that refreshes every 30 seconds. Scanning verifiers receive signed cryptographic payloads that prove validity without exposing raw document files.",
    },
  ];

  return (
    <div className="bg-white py-16 md:py-24">
      <div className="container-page space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Architecture &amp; Process</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900 sm:text-5xl">
            How SafirPass Verifies Identity Without Compromising Privacy
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            SafirPass replaces passport flashing with a privacy-first verification flow. Explore the technical steps powering our end-to-end tourist security ecosystem.
          </p>
        </div>

        {/* Hero image showcase */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
          <img
            src="/assets/liveness.jpg"
            alt="Biometric facial liveness verification scan on mobile app"
            className="w-full h-[380px] object-cover"
          />
        </div>

        {/* Step Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-sm space-y-4">
              <div className="flex size-14 items-center justify-center rounded-xl bg-white shadow-md border border-slate-200">
                {step.icon}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        {/* Granular Consent Callout */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-8 md:p-12 space-y-6">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Lock className="size-4" /> Zero PII Exposure Principle
            </span>
            <h2 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              "Share Only What Is Necessary"
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              When a hotel, SIM provider, or car rental agency scans your SafirPass QR code, they receive only the specific attribute token required by statutory law. Full passport documents and face biometric embeddings remain encrypted in your secure enclave.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <span>Get Your Digital ID</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/technology"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Read Cryptographic Whitepaper
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
