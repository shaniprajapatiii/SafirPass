"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  QrCode,
  Siren,
  Building2,
  Radar,
  WifiOff,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [consents, setConsents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const { data: kycData } = await supabase
          .from("kyc_applications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (kycData) setKyc(kycData);

        const { data: consentData } = await supabase
          .from("consent_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (consentData) setConsents(consentData);

        const { data: alertData } = await supabase
          .from("sos_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (alertData) setAlerts(alertData);
      } catch (e) {
        console.warn("Supabase fetch warning:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container-page space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <ShieldCheck className="size-3.5 text-blue-600" />
              <span>Supabase Authenticated Session</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-900">
              Welcome, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Tourist"}
            </h1>
            <p className="text-xs text-slate-500">
              Account Email: <span className="font-semibold text-slate-800">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/id"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <QrCode className="size-4" /> Digital ID &amp; QR
            </Link>
            <Link
              href="/dashboard/sos"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-colors"
            >
              <Siren className="size-4" /> Emergency SOS
            </Link>
          </div>
        </div>

        {/* KYC Status Banner */}
        {!kyc ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-900">No Digital Tourist ID Issued Yet</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Complete your document OCR and liveness verification to issue a hardware-bound Digital Tourist ID.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/verify"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 shrink-0"
            >
              <span>Start e-KYC Verification</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Digital Tourist ID Verified</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tourist ID <span className="font-mono font-bold text-slate-900">{kyc.tourist_id}</span> · Issued on {new Date(kyc.issued_at || kyc.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/id"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 shrink-0"
            >
              <span>View Credential &amp; Barcode</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/id"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                <QrCode className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Digital Tourist ID &amp; Dynamic QR</h3>
              <p className="text-xs text-slate-500 mt-1">
                Time-based 30s rotating QR code, Code 128 barcode, and printable identity card.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/consent"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <Building2 className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Consent Engine</h3>
              <p className="text-xs text-slate-500 mt-1">
                Real-time approvals for hotel check-ins, telecom SIM KYC, and permission access logs.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/sos"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
                <Siren className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-red-600 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Emergency SOS Pipeline</h3>
              <p className="text-xs text-slate-500 mt-1">
                3-second hold gesture panic trigger with GPS telemetry lock &amp; direct 112 routing.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/command"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Radar className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Authority Command Console</h3>
              <p className="text-xs text-slate-500 mt-1">
                Live spatial map radar, active dispatch triage queue, and scam trend analytics.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/verify"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                <UserCheck className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">e-KYC &amp; Verification Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Document OCR file upload, WebCam camera face liveness check, and authority approval flow.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/offline"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:scale-110 transition-transform">
                <WifiOff className="size-6" />
              </div>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Offline Verification Mode</h3>
              <p className="text-xs text-slate-500 mt-1">
                Local enclave cache status and offline Code 128 barcode verification simulator.
              </p>
            </div>
          </Link>
        </div>

        {/* Database Activity Log */}
        {kyc && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Verified Database Record (Supabase)</h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                PostgreSQL Record Active
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Full Name</span>
                <p className="font-bold text-slate-900 text-sm">{kyc.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Nationality</span>
                <p className="font-bold text-slate-900 text-sm">{kyc.nationality}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Passport Number</span>
                <p className="font-bold text-slate-900 text-sm">{kyc.passport_number}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Visa Reference</span>
                <p className="font-bold text-slate-900 text-sm">{kyc.visa_number || "Verified e-Visa"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
