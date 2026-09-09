"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  QrCode,
  ShieldCheck,
  Smartphone,
  Check,
  Clock,
  ScanFace,
  Building2,
  Lock,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import { QrGraphic, BarcodeGraphic } from "../../../components/QrGraphic";
import {
  ATTRIBUTES,
  OFFLINE_CACHE_KEY,
  attributeValue,
  barcodeValue,
  buildShare,
  encodeShare,
} from "../../../lib/credential";

const DEFAULT_KEYS = ["full_name", "nationality", "tourist_id", "validity"];

export default function DigitalIdPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState(DEFAULT_KEYS);

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/kyc/status");
      const data = await res.json();
      if (data?.kyc) {
        setKyc(data.kyc);
      }
    } catch (e) {
      console.warn("Failed to fetch KYC:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, [user]);

  const activeKyc = useMemo(() => {
    if (kyc) return kyc;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("safirpass_active_kyc");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  }, [kyc]);

  const share = useMemo(() => {
    if (!activeKyc) return null;
    return buildShare(activeKyc, keys);
  }, [activeKyc, keys]);

  const token = useMemo(() => (share ? encodeShare(share) : ""), [share]);

  const shareUrl = useMemo(() => {
    if (!token) return "";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/verify?d=${token}`;
  }, [token]);

  // Offline Cache Sync
  useEffect(() => {
    if (typeof window === "undefined" || !activeKyc || !token) return;
    window.localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        tourist_id: activeKyc.tourist_id,
        full_name: activeKyc.full_name,
        nationality: activeKyc.nationality,
        status: activeKyc.status,
        barcode: barcodeValue(activeKyc),
        token,
      })
    );
  }, [activeKyc, token]);

  const toggleKey = (key) => {
    setKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const downloadDocument = () => {
    const node = document.getElementById("credential-print-node");
    if (!node) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>SafirPass Digital Tourist ID - ${
      activeKyc?.tourist_id || "ID"
    }</title>
<style>body{font-family:sans-serif;color:#0f172a;margin:32px;} .card{border:1px solid #cbd5e1;border-radius:12px;padding:24px;margin-bottom:20px;background:#0f172a;color:#ffffff;} table{border-collapse:collapse;width:100%} td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:14px}</style>
</head><body>${node.innerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafirPass-ID-${activeKyc?.tourist_id || "credential"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md animate-pulse">
          <QrCode className="mx-auto size-8 text-blue-600 animate-spin" />
          <p className="mt-3 text-sm text-slate-600">Loading verified digital identity...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PENDING VERIFICATION / UNDER REVIEW SCREEN (24h Wait)
  // -------------------------------------------------------------
  if (activeKyc && activeKyc.status === "under_review") {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="container-page max-w-2xl space-y-8">
          <div className="rounded-3xl border-2 border-amber-300 bg-white p-8 md:p-10 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
              <Clock className="size-9 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
                Verification Under Review
              </span>
              <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-900">
                Digital Tourist ID is Locked
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Your documents and biometric face verification are currently being reviewed by the Immigration &amp; Tourism Authority. Estimated turnaround time is within <strong>24 hours</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold uppercase">Application Ref:</span>
                <span className="font-mono font-bold text-blue-700">{activeKyc.tourist_id || "IN-TID-PENDING"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold uppercase">Applicant Name:</span>
                <span className="font-bold text-slate-900">{activeKyc.full_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold uppercase">Passport:</span>
                <span className="font-mono font-bold text-slate-900">{activeKyc.passport_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold uppercase">Biometric Match:</span>
                <span className="font-bold text-emerald-700">Passed ({(activeKyc.liveness_score * 100).toFixed(0)}%)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={fetchKycStatus}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="size-4" />
                <span>Refresh Status</span>
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NO KYC REGISTERED SCREEN
  // -------------------------------------------------------------
  if (!activeKyc) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="container-page max-w-xl space-y-6 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <ScanFace className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-slate-900">No Digital Identity Found</h1>
              <p className="text-sm text-slate-600">
                Please complete one-time country document upload &amp; live biometric verification to generate your official Digital Tourist ID.
              </p>
            </div>
            <Link
              href="/dashboard/verify"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <span>Begin Verification (e-KYC)</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE & VERIFIED DIGITAL TOURIST ID CARD
  // -------------------------------------------------------------
  const code128 = barcodeValue(activeKyc);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-4xl space-y-8">
        {/* Page Title & Status */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Government of India Verified Digital Identity</span>
            </div>
            <h1 className="font-serif text-3xl font-extrabold text-slate-900 mt-1">
              Official Digital Tourist Pass
            </h1>
            <p className="text-xs text-slate-500">
              Attribute-siloed, privacy-first cryptographic digital identity for international travelers.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadDocument}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Download className="size-4" />
              <span>Download Pass</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <Printer className="size-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* The Digital Tourist Identity Card */}
        <div
          id="credential-print-node"
          className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-2xl space-y-8"
        >
          {/* Holographic Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <ShieldCheck className="size-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Republic of India • Ministry of Tourism
                </span>
                <h2 className="font-serif text-xl font-bold text-white">Smart Tourist Digital Identity</h2>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-base font-extrabold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/30">
                {activeKyc.tourist_id}
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-emerald-400 mt-1 font-bold">
                ● Government Certified
              </span>
            </div>
          </div>

          {/* Card Body: Biometric Snapshot, Profile & Dynamic QR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left: Biometric Photo & Core Traveler Metadata */}
            <div className="space-y-4">
              <div className="relative size-32 rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-md">
                {activeKyc.biometrics?.face_snapshot ? (
                  <img
                    src={activeKyc.biometrics.face_snapshot}
                    alt="Biometric Reference Face"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <ScanFace className="size-10 text-blue-400" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 text-center text-[9px] font-bold uppercase text-emerald-400">
                  Biometric Verified
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Full Legal Name</span>
                <p className="font-serif text-lg font-bold text-white">{activeKyc.full_name}</p>
                <p className="text-xs text-slate-300 font-medium">{activeKyc.nationality}</p>
              </div>
            </div>

            {/* Middle: Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs border-y md:border-y-0 md:border-x border-white/10 py-4 md:py-0 md:px-6">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Passport No</span>
                <p className="font-mono font-bold text-white text-sm">{activeKyc.passport_number}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Visa Category</span>
                <p className="font-semibold text-white">{activeKyc.visa_type}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Valid Dates</span>
                <p className="font-mono text-slate-300 text-[11px]">
                  {activeKyc.entry_date && activeKyc.exit_date
                    ? `${activeKyc.entry_date} → ${activeKyc.exit_date}`
                    : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Emergency Phone</span>
                <p className="font-mono text-slate-300 text-[11px]">{activeKyc.emergency_contact || "—"}</p>
              </div>
            </div>


            {/* Right: Dynamic Cryptographic QR Code */}
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <QrGraphic value={shareUrl || code128} size={140} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Dynamic Rotating HMAC-SHA256 Token
              </span>
            </div>
          </div>

          {/* Barcode & Security Strip */}
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="bg-white px-4 py-2 rounded-xl">
              <BarcodeGraphic value={code128} width={1.4} height={32} />
            </div>
            <div className="text-right text-[10px] text-slate-400 space-y-0.5">
              <p>Device Seal: <span className="font-mono text-slate-300">{activeKyc.device_seal_hash || "SEAL-GOV-AUTH"}</span></p>
              <p>Encrypted on Republic of India Digital Identity Framework</p>
            </div>
          </div>
        </div>

        {/* Selective Consent Sharing Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Granular Consent &amp; Data Siloing
            </h3>
            <span className="text-xs font-bold text-blue-600">Privacy First</span>
          </div>
          <p className="text-xs text-slate-500">
            Select which attributes are disclosed in your QR code when presenting to hotels, SIM counters, or transport.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {ATTRIBUTES.map((attr) => {
              const active = keys.includes(attr.key);
              return (
                <button
                  key={attr.key}
                  type="button"
                  onClick={() => toggleKey(attr.key)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition-all ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span>{attr.label}</span>
                  {active && <Check className="size-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
