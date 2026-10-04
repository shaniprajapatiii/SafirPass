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
  Clock,
  ScanFace,
  Lock,
  RefreshCw,
  FileCheck,
  Radio,
  MapPin,
  Sparkles,
  Scale,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingConsent, setPendingConsent] = useState(null);
  const [geoStatus, setGeoStatus] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const checkGeofenceSafety = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/geofences/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          if (data?.success) {
            setGeoStatus(data);
          }
        } catch (e) {
          console.warn("Geofence check note:", e.message);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        console.warn("Geolocation lock note:", err.message);
        setGeoLoading(false);
      }
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/kyc/status");
      const data = await res.json();
      if (data?.kyc) {
        setKyc(data.kyc);
      }
    } catch (e) {
      console.warn("Failed to load KYC status:", e);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingConsent = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/consent");
      const data = await res.json();
      const pending = data?.requests?.find((r) => r.status === "pending");
      setPendingConsent(pending || null);
    } catch (e) {
      console.warn("Consent check note:", e.message);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      checkPendingConsent();
      checkGeofenceSafety();
      const interval = setInterval(checkPendingConsent, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const isVerified = kyc?.status === "verified";
  const isUnderReview = kyc?.status === "under_review";

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="container-page space-y-8">
        {/* Real-time Incoming Check-In Consent Alert Banner */}
        {pendingConsent && (
          <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/95 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs shrink-0">
                <Radio className="size-6 animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-900 block">
                  Check-In Scan Detected • Action Required
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {pendingConsent.requester} is requesting your check-in credentials
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Approve or deny this request to share your verified identity without handing over your physical passport.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/consent"
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition-colors shrink-0"
            >
              <span>Review &amp; Approve</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <ShieldCheck className="size-3.5 text-blue-600" />
              <span>Smart Tourist Identity Portal</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-900">
              Welcome, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "International Traveler"}
            </h1>
            <p className="text-xs text-slate-500">
              Account: <span className="font-semibold text-slate-800">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/id"
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors ${
                isVerified ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-800"
              }`}
            >
              <QrCode className="size-4" />
              <span>{isVerified ? "Digital ID & QR" : "Digital ID (Locked)"}</span>
            </Link>
            <Link
              href="/dashboard/sos"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-colors"
            >
              <Siren className="size-4" /> Emergency SOS
            </Link>
          </div>
        </div>

        {/* Live GPS Geofence Safety Radar Banner */}
        {geoStatus ? (
          geoStatus.activeAlert ? (
            <div className={`rounded-2xl border-2 p-5 shadow-sm space-y-3 animate-in slide-in-from-top-2 ${
              geoStatus.activeAlert.level === "CRITICAL"
                ? "border-red-500 bg-red-50 text-red-950"
                : "border-amber-400 bg-amber-50 text-amber-950"
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`flex size-10 items-center justify-center rounded-xl text-white shadow-xs ${
                    geoStatus.activeAlert.level === "CRITICAL" ? "bg-red-600" : "bg-amber-600"
                  }`}>
                    <Radar className="size-5 animate-spin" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
                      Geofence Safety Alert • {geoStatus.activeAlert.level} Priority
                    </span>
                    <h3 className="text-base font-bold">
                      {geoStatus.activeAlert.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="tel:1363"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-800 border border-slate-300 shadow-xs hover:bg-slate-50 transition"
                  >
                    <span>Helpline 1363</span>
                  </a>
                  <Link
                    href="/dashboard/sos"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
                  >
                    <Siren className="size-3.5" />
                    <span>Emergency SOS</span>
                  </Link>
                </div>
              </div>

              <p className="text-xs leading-relaxed bg-white/60 p-3 rounded-xl border border-current/10">
                {geoStatus.activeAlert.message}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <Radar className="size-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950">
                      Live Tourist Safety Radar Active
                    </h4>
                    <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                      Status: Safe
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    {geoStatus.nearestGeofence
                      ? `Nearest monitored zone: ${geoStatus.nearestGeofence.name} (${geoStatus.nearestGeofence.distanceKm} km away)`
                      : "Continuous GPS boundary surveillance active. No high-risk perimeters nearby."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={checkGeofenceSafety}
                disabled={geoLoading}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`size-3 text-emerald-700 ${geoLoading ? "animate-spin" : ""}`} />
                <span>Rescan GPS</span>
              </button>
            </div>
          )
        ) : null}
        {!kyc ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Action Required: Complete Document &amp; Face e-KYC</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Upload your country travel documents and take a quick live biometric face scan to request your official Digital Tourist Identity.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/verify"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 shrink-0"
            >
              <span>Begin e-KYC Verification</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : isUnderReview ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock className="size-7 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  <span>Under Review by Authority • Est. Turnaround 24 Hours</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Verification Pending Government Approval
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Application <span className="font-mono font-bold text-slate-900">{kyc.tourist_id}</span> is under review by Immigration &amp; Tourism Authority officers. Your Digital ID will unlock automatically upon approval.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-50"
              >
                <RefreshCw className="size-3.5" />
                <span>Refresh Status</span>
              </button>
              <Link
                href="/dashboard/verify"
                className="flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800"
              >
                <span>View Status Details</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-7 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  <span>Certified by Republic of India Immigration Bureau</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Government-Verified Digital Tourist ID Active
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tourist ID: <span className="font-mono font-bold text-slate-900">{kyc.tourist_id}</span> • Dynamic QR Code &amp; Biometric Pass Unlocked
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/id"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 shrink-0"
            >
              <span>Open Digital Tourist Card</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* Feature Action Grid - Unlocked Only Upon Verification */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-slate-900">
              Tourist Services &amp; Digital Utilities
            </h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}>
              {isVerified ? "All Services Active" : "Services Locked (Pending Verification)"}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Digital ID Pass Card */}
            <Link
              href={isVerified ? "/dashboard/id" : "/dashboard/verify"}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all space-y-4 ${
                isVerified
                  ? "border-slate-200 hover:shadow-md hover:border-blue-300"
                  : "border-slate-200 opacity-80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-12 items-center justify-center rounded-xl transition-transform ${
                  isVerified ? "bg-blue-50 text-blue-600 group-hover:scale-110" : "bg-slate-100 text-slate-400"
                }`}>
                  <QrCode className="size-6" />
                </div>
                {isVerified ? (
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                ) : (
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Lock className="size-3" /> Locked
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Digital Tourist ID &amp; Dynamic QR</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isVerified
                    ? "Selective disclosure dynamic rotating QR code, Code 128 barcode, and printable identity card."
                    : "Unlocks official Government-Certified Digital ID pass once reviewed and verified by the authority."}
                </p>
              </div>
            </Link>

            {/* Consent Engine Card */}
            <Link
              href={isVerified ? "/dashboard/consent" : "/dashboard/verify"}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all space-y-4 ${
                isVerified
                  ? "border-slate-200 hover:shadow-md hover:border-emerald-300"
                  : "border-slate-200 opacity-80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-12 items-center justify-center rounded-xl transition-transform ${
                  isVerified ? "bg-emerald-50 text-emerald-600 group-hover:scale-110" : "bg-slate-100 text-slate-400"
                }`}>
                  <Building2 className="size-6" />
                </div>
                {isVerified ? (
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                ) : (
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Lock className="size-3" /> Locked
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hotel &amp; SIM Consent Engine</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isVerified
                    ? "Real-time approvals for hotel check-ins, telecom SIM KYC, and granular privacy access logs."
                    : "Permits seamless hotel check-in without surrendering physical passport after verification."}
                </p>
              </div>
            </Link>

            {/* Emergency SOS Panic Pipeline */}
            <Link
              href={isVerified ? "/dashboard/sos" : "/dashboard/verify"}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all space-y-4 ${
                isVerified
                  ? "border-slate-200 hover:shadow-md hover:border-red-300"
                  : "border-slate-200 opacity-80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-12 items-center justify-center rounded-xl transition-transform ${
                  isVerified ? "bg-red-50 text-red-600 group-hover:scale-110" : "bg-slate-100 text-slate-400"
                }`}>
                  <Siren className="size-6" />
                </div>
                {isVerified ? (
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                ) : (
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Lock className="size-3" /> Locked
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Emergency SOS Panic Pipeline</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isVerified
                    ? "3-second hold gesture panic trigger with GPS telemetry lock & direct 112 police/ambulance routing."
                    : "Dispatches emergency incident telemetry directly to 112 control rooms once certified."}
                </p>
              </div>
            </Link>

            {/* e-KYC Verification & Status */}
            <Link
              href="/dashboard/verify"
              className="group rounded-2xl border border-blue-200 bg-blue-50/30 p-6 shadow-sm hover:shadow-md hover:border-blue-400 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white group-hover:scale-110 transition-transform">
                  <ScanFace className="size-6" />
                </div>
                <ArrowRight className="size-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">e-KYC &amp; Biometric Scan Portal</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Country-specific document upload, WebCam biometric face scan, and 24h government review tracking.
                </p>
              </div>
            </Link>

            {/* Safety Incident Radar */}
            <Link
              href={isVerified ? "/dashboard/command" : "/dashboard/verify"}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all space-y-4 ${
                isVerified
                  ? "border-slate-200 hover:shadow-md hover:border-indigo-300"
                  : "border-slate-200 opacity-80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-12 items-center justify-center rounded-xl transition-transform ${
                  isVerified ? "bg-indigo-50 text-indigo-600 group-hover:scale-110" : "bg-slate-100 text-slate-400"
                }`}>
                  <Radar className="size-6" />
                </div>
                {isVerified ? (
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                ) : (
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Lock className="size-3" /> Locked
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Safety Incident Radar</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Live spatial map radar, geofenced tourist safety zones, and active responder units.
                </p>
              </div>
            </Link>

            {/* Offline Enclave Mode */}
            <Link
              href={isVerified ? "/dashboard/offline" : "/dashboard/verify"}
              className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all space-y-4 ${
                isVerified
                  ? "border-slate-200 hover:shadow-md hover:border-slate-300"
                  : "border-slate-200 opacity-80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-12 items-center justify-center rounded-xl transition-transform ${
                  isVerified ? "bg-slate-100 text-slate-700 group-hover:scale-110" : "bg-slate-100 text-slate-400"
                }`}>
                  <WifiOff className="size-6" />
                </div>
                {isVerified ? (
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                ) : (
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <Lock className="size-3" /> Locked
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Offline Verification Mode</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Local cryptographic enclave cache and offline Code 128 barcode validation in remote areas.
                </p>
              </div>
            </Link>

            {/* Tourist Grievance & Scam Desk */}
            <Link
              href="/dashboard/complaints"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  <Scale className="size-6" />
                </div>
                <ArrowRight className="size-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Grievance &amp; Scam Desk</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Report fare gouging, fake guides, or hotel booking fraud with AI triage and direct police dispatch.
                </p>
              </div>
            </Link>
          </div>
        </div>


        {/* Stored Record Breakdown (PostgreSQL + MongoDB) */}
        {kyc && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  Active Tourist Identity Record (Dual Database)
                </h3>
                <p className="text-xs text-slate-500">
                  Relational state stored in PostgreSQL • Biometric logs &amp; document vault in MongoDB
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-md border ${
                isVerified ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"
              }`}>
                Status: {kyc.status.toUpperCase()}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Full Legal Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{kyc.full_name}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Nationality</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{kyc.nationality}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Passport Number</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{kyc.passport_number}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Visa / Category</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{kyc.visa_type}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
