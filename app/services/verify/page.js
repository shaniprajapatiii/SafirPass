"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Smartphone,
  Car,
  Landmark,
  ShieldCheck,
  Camera,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  Radio,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Lock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../../lib/auth-context";

const SERVICE_PROFILES = [
  {
    id: "hotel",
    label: "Hotels & Homestays",
    sublabel: "Bureau of Immigration Form-C Compliance",
    icon: Building2,
    badge: "Form-C Gateway",
    color: "from-blue-600 to-indigo-700",
    defaultProvider: "The Taj Palace Hotel, New Delhi",
    purpose: "Foreigners Act 1946 Form-C Hotel Registration",
    attributes: ["full_name", "nationality", "passport_number", "visa", "validity"],
  },
  {
    id: "telecom",
    label: "Telecom SIM e-KYC",
    sublabel: "DOT Mandatory Identity Verification",
    icon: Smartphone,
    badge: "Telecom Desk",
    color: "from-purple-600 to-pink-600",
    defaultProvider: "Airtel International Airport T3 Counter",
    purpose: "Department of Telecommunications Tourist SIM Issuance",
    attributes: ["full_name", "nationality", "passport_number", "visa"],
  },
  {
    id: "rental",
    label: "Vehicle & Scooter Rentals",
    sublabel: "Motor Vehicles Act Verified Check",
    icon: Car,
    badge: "Rental Counter",
    color: "from-emerald-600 to-teal-700",
    defaultProvider: "Goa Coastal Self-Drive Rentals",
    purpose: "Tourist Vehicle Rental Agreement & Driving Eligibility",
    attributes: ["full_name", "nationality", "emergency_contact", "validity"],
  },
  {
    id: "attraction",
    label: "Heritage Sites & Monuments",
    sublabel: "ASI Verified Tourist Entry",
    icon: Landmark,
    badge: "ASI Ticketing",
    color: "from-amber-600 to-orange-700",
    defaultProvider: "Archaeological Survey of India (Taj Mahal Desk)",
    purpose: "International Heritage Ticket Concession & Entry Validation",
    attributes: ["full_name", "nationality", "validity"],
  },
];

export default function ServiceVerificationTerminal() {
  const { user } = useAuth();

  const [selectedService, setSelectedService] = useState(SERVICE_PROFILES[0]);
  const [providerName, setProviderName] = useState(SERVICE_PROFILES[0].defaultProvider);
  const [touristInput, setTouristInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef(null);

  // Handshake session states: "idle" | "requesting" | "waiting_approval" | "approved" | "denied" | "error"
  const [handshakeState, setHandshakeState] = useState("idle");
  const [activeConsentId, setActiveConsentId] = useState(null);
  const [approvedData, setApprovedData] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [elapsedWait, setElapsedWait] = useState(0);

  // Update provider name when switching service
  const handleServiceChange = (service) => {
    setSelectedService(service);
    setProviderName(service.defaultProvider);
    resetTerminal();
  };

  const resetTerminal = () => {
    setHandshakeState("idle");
    setActiveConsentId(null);
    setApprovedData(null);
    setStatusMessage("");
    setElapsedWait(0);
  };

  // 1. Submit consent request to the tourist's phone
  const initiateConsentHandshake = async (touristIdOrToken) => {
    const identifier = (touristIdOrToken || touristInput).trim();
    if (!identifier) {
      setStatusMessage("Please enter a Tourist ID or scan the dynamic QR code.");
      return;
    }

    setHandshakeState("requesting");
    setStatusMessage("Transmitting cryptographic consent challenge to tourist...");

    try {
      const isToken = identifier.includes(".") || identifier.length > 50;

      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourist_id: isToken ? undefined : identifier,
          token: isToken ? identifier : undefined,
          requester: providerName.trim() || selectedService.defaultProvider,
          requester_type: selectedService.id,
          attributes: selectedService.attributes,
          purpose: selectedService.purpose,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to transmit consent request.");
      }

      setActiveConsentId(data.consentId);
      setHandshakeState("waiting_approval");
      setStatusMessage(`Challenge sent to tourist pass ${data.touristId || identifier}. Waiting for tourist tap...`);
      setElapsedWait(0);
    } catch (err) {
      setHandshakeState("error");
      setStatusMessage(err.message || "Consent transmission failed.");
    }
  };

  // 2. Poll for tourist approval every 2 seconds while waiting
  useEffect(() => {
    if (handshakeState !== "waiting_approval" || !activeConsentId) return;

    const timer = setInterval(() => {
      setElapsedWait((prev) => prev + 1);
    }, 1000);

    const poller = setInterval(async () => {
      try {
        const res = await fetch(`/api/consent?id=${activeConsentId}`);
        const data = await res.json();

        if (data?.request?.status === "approved") {
          clearInterval(poller);
          setHandshakeState("approved");
          setApprovedData(data.touristDetails);
          setStatusMessage("Consent approved! Verified demographic credentials unlocked.");
        } else if (data?.request?.status === "denied") {
          clearInterval(poller);
          setHandshakeState("denied");
          setStatusMessage("Tourist denied the consent request on their device.");
        }
      } catch (e) {
        console.warn("Polling consent status note:", e.message);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [handshakeState, activeConsentId]);

  // 3. Camera QR Scanner setup
  const startCamera = async () => {
    setScannerError("");
    setCameraActive(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scannerId = "service-camera-reader";

      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              stopCamera();
              let scannedToken = decodedText.trim();
              if (scannedToken.includes("?d=")) {
                scannedToken = scannedToken.split("?d=")[1].split("&")[0];
              } else if (scannedToken.includes("token=")) {
                scannedToken = scannedToken.split("token=")[1].split("&")[0];
              }
              setTouristInput(scannedToken);
              initiateConsentHandshake(scannedToken);
            },
            () => {}
          );
        } catch (initErr) {
          setScannerError(initErr.message || "Failed to access device camera.");
          setCameraActive(false);
        }
      }, 100);
    } catch {
      setScannerError("Camera QR scanner not available.");
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // One-click Form-C / Dossier Print
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="container-page max-w-4xl space-y-8">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <ShieldCheck className="size-3.5 text-blue-600" />
              <span>Foreigners Act 1946 &amp; DPDP Act 2023 Enterprise Gateway</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Universal Service Verification &amp; Form-C Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Eliminate paper passport photocopies. Scan tourist passes, request live consent, and instantly unlock certified Form-C dossiers.
            </p>
          </div>

          <Link
            href="/verify"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
          >
            <QrCode className="size-3.5" />
            <span>Public Scanner</span>
          </Link>
        </div>

        {/* 1. Service Profile Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SERVICE_PROFILES.map((service) => {
            const Icon = service.icon;
            const active = selectedService.id === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => handleServiceChange(service)}
                className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? "border-blue-600 bg-white shadow-md ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 opacity-80"
                }`}
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl text-white bg-gradient-to-br ${service.color} mb-2 shadow-xs`}
                >
                  <Icon className="size-5" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                  {service.label}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                  {service.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. Provider Context & Scan Input */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                Active Provider Counter
              </span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none w-72"
                  placeholder="Enter Hotel / Business Name..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  cameraActive
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Camera className="size-4" />
                <span>{cameraActive ? "Close Camera" : "Scan Tourist QR"}</span>
              </button>
            </div>
          </div>

          {/* Camera Scanner Viewfinder */}
          {cameraActive && (
            <div className="rounded-2xl border-2 border-blue-500 bg-slate-950 p-4 space-y-2 animate-in fade-in">
              <div id="service-camera-reader" className="w-full overflow-hidden rounded-xl min-h-[260px]" />
              <p className="text-center text-xs text-slate-300">
                Align the tourist's dynamic rotating QR code on screen to request instant check-in consent.
              </p>
            </div>
          )}

          {scannerError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600 shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Manual Tourist ID Entry */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Tourist SafirPass ID or Token
              </label>
              <input
                type="text"
                value={touristInput}
                onChange={(e) => setTouristInput(e.target.value)}
                placeholder="e.g. IN-TID-884920 or paste scanned dynamic token..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="w-full sm:w-auto sm:self-end">
              <button
                type="button"
                onClick={() => initiateConsentHandshake()}
                disabled={handshakeState === "waiting_approval" || handshakeState === "requesting"}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {handshakeState === "requesting" ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Radio className="size-4" />
                )}
                <span>Request Consent</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Live Handshake State Monitor */}
        {handshakeState === "waiting_approval" && (
          <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/70 p-6 shadow-md text-center space-y-4 animate-in fade-in">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Radio className="size-8 animate-pulse text-amber-600" />
            </div>
            <div className="space-y-1">
              <span className="rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">
                Real-Time Handshake Active
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                Waiting for Tourist Approval on Mobile Pass...
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {statusMessage}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold text-amber-800">
              <Clock className="size-4" />
              <span>Elapsed: {elapsedWait}s (Polling active)</span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl max-w-md mx-auto border border-amber-200 text-[11px] text-slate-600 text-left space-y-1">
              <p className="font-bold text-slate-800">Tourist Action Required:</p>
              <p>1. Tourist opens their SafirPass app &rarr; <strong>Consent Requests</strong> page.</p>
              <p>2. Tourist reviews the requested attributes and taps <strong>Approve</strong>.</p>
            </div>

            <button
              type="button"
              onClick={resetTerminal}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Cancel Handshake
            </button>
          </div>
        )}

        {handshakeState === "denied" && (
          <div className="rounded-3xl border-2 border-rose-500 bg-white p-6 shadow-md text-center space-y-4">
            <XCircle className="mx-auto size-12 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900">Consent Request Denied</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              The tourist declined to disclose their personal credentials for this service.
            </p>
            <button
              type="button"
              onClick={resetTerminal}
              className="rounded-xl bg-slate-900 text-white text-xs font-bold px-5 py-2.5 cursor-pointer"
            >
              Start New Request
            </button>
          </div>
        )}

        {/* 4. APPROVED DATA & OFFICIAL DOSSIER GENERATION */}
        {handshakeState === "approved" && approvedData && (
          <div className="space-y-6 animate-in fade-in">
            {/* Success Bar */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500 text-white p-4 shadow-md">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold">VERIFIED &amp; UNLOCKED VIA TOURIST CONSENT</h3>
                  <p className="text-xs text-emerald-100">
                    Consent granted for {providerName} • DPDP Act 2023 Compliant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="flex items-center gap-1.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="size-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={resetTerminal}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>New Guest</span>
                </button>
              </div>
            </div>

            {/* Official Indian Bureau of Immigration Form-C Document */}
            {selectedService.id === "hotel" && (
              <div
                id="safirpass-form-c-dossier"
                className="rounded-3xl border-2 border-slate-300 bg-[#fdfdfb] p-6 sm:p-8 shadow-xl text-slate-900 space-y-6 print:border-none print:shadow-none print:p-0"
              >
                {/* Government Header */}
                <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                      FORM C • REGISTRATION OF FOREIGNERS RULES 1992
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-black text-slate-900">
                      BUREAU OF IMMIGRATION • GOVERNMENT OF INDIA
                    </h2>
                    <p className="text-xs text-slate-600 font-semibold">
                      Hotel Arrival &amp; Check-In Registration Report (Digital Form-C Certificate)
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold bg-blue-900 text-white px-2.5 py-1 rounded">
                      {approvedData.hotel_compliance?.reference || "FORM-C-VERIFIED"}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 font-mono">
                      Timestamp: {new Date().toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Hotel & Property Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Registered Property</span>
                    <p className="font-extrabold text-slate-900">{providerName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Compliance Reference</span>
                    <p className="font-mono font-bold text-blue-900">
                      {approvedData.hotel_compliance?.reference || "BOI-DEL-4920"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Verification Standard</span>
                    <p className="font-bold text-emerald-700">Foreigners Act 1946 Digital KYC</p>
                  </div>
                </div>

                {/* Foreign National Disclosed Attributes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                    Foreign Guest Personal &amp; Travel Particulars
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Full Name (As on Passport)</span>
                      <p className="font-bold text-slate-950 text-sm">{approvedData.full_name || "—"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">SafirPass Tourist ID</span>
                      <p className="font-mono font-bold text-blue-900 text-sm">{approvedData.tourist_id || "—"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Nationality / Citizenship</span>
                      <p className="font-bold text-slate-900 text-sm">{approvedData.nationality || "—"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Passport Number</span>
                      <p className="font-mono font-bold text-slate-900 text-sm">{approvedData.passport_number || "—"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Indian Visa Particulars</span>
                      <p className="font-bold text-slate-900 text-sm">{approvedData.visa || "e-Tourist Visa"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Authorized Stay Validity</span>
                      <p className="font-bold text-emerald-800 text-sm">{approvedData.validity || "30 Days Multi-Entry"}</p>
                    </div>
                  </div>
                </div>

                {/* Legal Certification Stamp */}
                <div className="rounded-2xl border border-slate-300 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="size-3.5 text-blue-600" />
                      <span>Zero Paper Copy Guarantee:</span>
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed max-w-lg">
                      Physical passport retained: <strong>NO</strong>. Physical photocopy taken: <strong>NO</strong>.
                      This record is cryptographically signed and archived under Government of India Digital Personal Data Protection Act 2023.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block border-2 border-emerald-600 text-emerald-800 font-extrabold text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest shadow-2xs">
                      FORM-C CERTIFIED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Telecom / Rental / Attraction Unlocked Card */}
            {selectedService.id !== "hotel" && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <FileCheck2 className="size-6 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {selectedService.label} Verification Dossier
                    </h3>
                    <p className="text-xs text-slate-500">
                      Approved for service issuance at {providerName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {Object.entries(approvedData).map(([key, val]) => {
                    if (typeof val !== "string") return null;
                    return (
                      <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{key.replace(/_/g, " ")}</span>
                        <p className="font-bold text-slate-900 mt-0.5">{val}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
